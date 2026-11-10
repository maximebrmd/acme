import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// The publishing context's tables, in their own Postgres schema. Instants are
// timestamptz written from the Clock (never NOW()), so tests control them.
// Effect's cluster tables (cluster_*) live in the public schema, created by
// Effect itself: drizzle-kit never sees them.

export const publishing = pgSchema("publishing");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * A post and where it is in its life. A scheduled post keeps its instant in
 * UTC and the IANA zone it was chosen in. `schedule_revision` goes up with
 * every schedule and every move back to draft: the job started for a
 * revision (`execution_id`) only publishes while the post still has it.
 *
 * Its content: `text`, the `media` it shows in order (media ids with their
 * alt text) and `text_overrides`, the text it has instead on some channels.
 * `author_id` is the member who created it (a Better Auth user id), null
 * when an API key did, or for posts from before authors were kept.
 *
 * `created_via` and `scheduled_via` say how its creator, and whoever last
 * scheduled or moved it, reached Peal (the web app, an API key, an OAuth
 * application, with the key's or the application's id and name: JSON the
 * domain's `PostOriginSchema` decodes), and `scheduled_by` which member
 * scheduled it. All null on posts from before they were kept, the last two
 * on a draft too, and `scheduled_by` when an API key scheduled it.
 */
export const posts = publishing.table(
  "posts",
  {
    authorId: uuid("author_id"),
    cancelledAt: instant("cancelled_at"),
    createdVia: jsonb("created_via"),
    executionId: text("execution_id"),
    finishedAt: instant("finished_at"),
    id: uuid("id").primaryKey(),
    media: jsonb("media").notNull().default([]),
    outcome: text("outcome"),
    scheduleRevision: integer("schedule_revision").notNull().default(0),
    scheduleZone: text("schedule_zone"),
    scheduledAt: instant("scheduled_at"),
    scheduledBy: uuid("scheduled_by"),
    scheduledVia: jsonb("scheduled_via"),
    startedAt: instant("started_at"),
    status: text("status").notNull(),
    text: text("text").notNull().default(""),
    textOverrides: jsonb("text_overrides").notNull().default([]),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    index("posts_workspace_scheduled_at").on(
      table.workspaceId,
      table.scheduledAt
    ),
    // The posts waiting to go out, in every workspace, by their time: what
    // the staff console counts as due and overdue.
    index("posts_scheduled")
      .on(table.scheduledAt)
      .where(sql`${table.status} = 'scheduled'`),
    // A workspace's posts by creation, either way: ids are UUIDv7s.
    index("posts_workspace_id").on(table.workspaceId, table.id),
    // A workspace's drafts, newest first: ids are UUIDv7s.
    index("posts_workspace_drafts")
      .on(table.workspaceId, table.id)
      .where(sql`${table.status} = 'draft'`),
  ]
);

/**
 * A post on one channel. `round` goes up when the user sends it again, so a
 * job from an earlier round leaves it alone. `options` holds what the post
 * says there that only the channel's platform knows (a YouTube title, who
 * sees a TikTok post), tagged by `platform`, and is null on platforms that
 * take none: rows from before options were kept have none. `kept_private`
 * is true on a published target the platform made private although asked
 * to show it to more people. `content_digest` is the SHA-256 of what the
 * target sends to its channel (its text there and its media ids), written
 * when its post is scheduled, by which the same content sent to the same
 * channel again is found; null on a draft never scheduled, and on rows from
 * before it was kept.
 */
export const postTargets = publishing.table(
  "post_targets",
  {
    cancelRequested: boolean("cancel_requested").notNull().default(false),
    channelId: uuid("channel_id").notNull(),
    contentDigest: text("content_digest"),
    failureCode: text("failure_code"),
    failureReason: text("failure_reason"),
    finishedAt: instant("finished_at"),
    id: uuid("id").primaryKey(),
    keptPrivate: boolean("kept_private").notNull().default(false),
    options: jsonb("options"),
    permalink: text("permalink"),
    platformPostId: text("platform_post_id"),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    round: integer("round").notNull().default(1),
    startedAt: instant("started_at"),
    status: text("status").notNull(),
    unconfirmedReason: text("unconfirmed_reason"),
  },
  (table) => [
    unique("post_targets_post_channel").on(table.postId, table.channelId),
    // The targets that send the same content to a channel.
    index("post_targets_channel_content")
      .on(table.channelId, table.contentDigest)
      .where(sql`${table.contentDigest} IS NOT NULL`),
    // Targets in the order they went live, which analytics follows.
    index("post_targets_published")
      .on(table.finishedAt, table.id)
      .where(sql`${table.status} = 'published'`),
  ]
);

/**
 * Every attempt at publishing a target, and what was decided after it: the
 * history support reads when a post went out late or not at all.
 */
export const publicationAttempts = publishing.table(
  "publication_attempts",
  {
    attempt: integer("attempt").notNull(),
    decision: text("decision").notNull(),
    // The attempt's outcome as stored in the workflow history: ids and codes,
    // never content.
    detail: jsonb("detail").notNull(),
    finishedAt: instant("finished_at").notNull(),
    outcome: text("outcome").notNull(),
    retryDelayMillis: integer("retry_delay_millis"),
    round: integer("round").notNull(),
    startedAt: instant("started_at").notNull(),
    targetId: uuid("target_id")
      .notNull()
      .references(() => postTargets.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.targetId, table.round, table.attempt] }),
  ]
);

/**
 * The journal of calls to the platforms. A row is written, and committed,
 * before the call; `finished_at` and `outcome` once it answered. A row with
 * no `finished_at` is a call whose fate is unknown.
 *
 * One row per attempt of a round, whatever its key: a second job for the same
 * attempt, as after a change to how keys are made, finds the first one's call
 * instead of sending again.
 *
 * `progress` is how far a call of several requests got, as its adapter
 * recorded it before each request that matters (TikTok's `publish_id`):
 * ids and states, never content. Null until an adapter records something.
 */
export const publicationCalls = publishing.table(
  "publication_calls",
  {
    attempt: integer("attempt").notNull(),
    finishedAt: instant("finished_at"),
    idempotencyKey: text("idempotency_key").primaryKey(),
    operation: text("operation").notNull(),
    outcome: jsonb("outcome"),
    progress: jsonb("progress"),
    round: integer("round").notNull(),
    startedAt: instant("started_at").notNull(),
    targetId: uuid("target_id")
      .notNull()
      .references(() => postTargets.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("publication_calls_target_round_attempt").on(
      table.targetId,
      table.round,
      table.attempt
    ),
  ]
);

/**
 * A resumable upload a platform keeps for one publishing call (YouTube's
 * videos.insert), journaled before any byte is sent, so a run found in
 * flight asks the platform where the upload stands instead of sending it
 * again. `session_url` is where the bytes go, cleared once the platform
 * made the video, whose id `video_id` then keeps; `final_part_sent` is set
 * before the part holding the last byte leaves, after which the video may
 * exist. Rows go with their call.
 */
export const uploadSessions = publishing.table("upload_sessions", {
  byteSize: bigint("byte_size", { mode: "number" }).notNull(),
  finalPartSent: boolean("final_part_sent").notNull().default(false),
  idempotencyKey: text("idempotency_key")
    .primaryKey()
    .references(() => publicationCalls.idempotencyKey, { onDelete: "cascade" }),
  openedAt: instant("opened_at").notNull(),
  sessionUrl: text("session_url"),
  videoId: text("video_id"),
});

/**
 * The idempotency keys of the requests that made posts in one call
 * (`posts.send`), by workspace: the SHA-256 of the key its client chose and
 * of the request it came with, never either, and the post it made. A key
 * is free again 24 hours after `created_at`; the
 * `publishing.idempotency-retention` cron deletes those past it. Rows go
 * with their workspace, and name nobody.
 */
export const idempotencyKeys = publishing.table(
  "idempotency_keys",
  {
    createdAt: instant("created_at").notNull(),
    keyDigest: text("key_digest").notNull(),
    postId: uuid("post_id").notNull(),
    requestDigest: text("request_digest").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.keyDigest] }),
    index("idempotency_keys_created_at").on(table.createdAt),
  ]
);

/**
 * Units of a platform's daily quota this server spent, by bucket and day,
 * as the platform counts its days (YouTube: in Pacific Time). Counts only,
 * naming nobody.
 */
export const quotaUsage = publishing.table(
  "quota_usage",
  {
    bucket: text("bucket").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    units: integer("units").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.bucket, table.day] }),
    check("quota_usage_units", sql`${table.units} >= 0`),
  ]
);
