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
  uniqueIndex,
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
 * alt text) and `text_overrides`, the text it has instead on some channels,
 * each with the media it shows there instead when it gives some (`media`,
 * left out otherwise).
 * That is its first part; `follow_ups` holds the parts after it, in order,
 * as the domain's `PostPart` encodes them (text, media, text overrides and
 * the seconds each waits), empty on a post of one part, as every post from
 * before parts is. `poll` is the poll asked with the first part, as the
 * domain's `Poll` encodes it (its choices, minutes open, whether several
 * may be picked), null on a post without one, as on every post from
 * before polls.
 * `author_id` is the member who created it (a Better Auth user id), null
 * when an API key did, or for posts from before authors were kept.
 *
 * `created_via` and `scheduled_via` say how its creator, and whoever last
 * scheduled or moved it, reached Peal (the web app, an API key, an OAuth
 * application, with the key's or the application's id and name: JSON the
 * domain's `PostOriginSchema` decodes), and `scheduled_by` which member
 * scheduled it. All null on posts from before they were kept, the last two
 * on a draft too, and `scheduled_by` when an API key scheduled it.
 *
 * `tag_ids` are the tags (`tags`) its workspace filed it under, each once:
 * no part of what it says, and written apart from its status
 * (`PostRepository.setTags`), so a job that settles the post never undoes
 * a tagging made meanwhile.
 *
 * `queue_id` is the queue (`queues`) that gave it its time, null for a
 * time chosen by hand: the post holds that queue's slot while it is
 * scheduled, awaiting approval or publishing at exactly the slot's
 * instant, which is all a slot's being taken is. No foreign key, as
 * elsewhere here: deleting a queue clears the column in its transaction.
 *
 * `recycling_id` and `occurrence` say which recycling rule
 * (`recycling_rules`) made the post, and its place among the rule's posts,
 * from 2; null on any other post. Their unique index is what makes an
 * occurrence once, whoever runs the rule.
 */
export const posts = publishing.table(
  "posts",
  {
    authorId: uuid("author_id"),
    cancelledAt: instant("cancelled_at"),
    createdVia: jsonb("created_via"),
    executionId: text("execution_id"),
    finishedAt: instant("finished_at"),
    followUps: jsonb("follow_ups").notNull().default([]),
    id: uuid("id").primaryKey(),
    media: jsonb("media").notNull().default([]),
    occurrence: integer("occurrence"),
    outcome: text("outcome"),
    poll: jsonb("poll"),
    queueId: uuid("queue_id"),
    recyclingId: uuid("recycling_id"),
    scheduleRevision: integer("schedule_revision").notNull().default(0),
    scheduleZone: text("schedule_zone"),
    scheduledAt: instant("scheduled_at"),
    scheduledBy: uuid("scheduled_by"),
    scheduledVia: jsonb("scheduled_via"),
    // Whether its links go out shortened, where the server has short links.
    shortenLinks: boolean("shorten_links").notNull().default(false),
    startedAt: instant("started_at"),
    status: text("status").notNull(),
    tagIds: uuid("tag_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    text: text("text").notNull().default(""),
    textOverrides: jsonb("text_overrides").notNull().default([]),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // The posts filed under a tag.
    index("posts_tag_ids").using("gin", table.tagIds),
    index("posts_workspace_scheduled_at").on(
      table.workspaceId,
      table.scheduledAt
    ),
    // The posts waiting to go out, in every workspace, by their time: what
    // the staff console counts as due and overdue.
    index("posts_scheduled")
      .on(table.scheduledAt)
      .where(sql`${table.status} = 'scheduled'`),
    // The posts waiting for an approval in a workspace, whatever their
    // time: what the view across workspaces counts.
    index("posts_workspace_awaiting_approval")
      .on(table.workspaceId)
      .where(sql`${table.status} = 'awaitingApproval'`),
    // A workspace's posts that ended with a channel failed or to check, by
    // when they ended: what the view across workspaces counts over its
    // last days. Few posts end so, so the index stays small.
    index("posts_workspace_finished_attention")
      .on(table.workspaceId, table.finishedAt)
      .where(
        sql`${table.status} = 'finished' AND ${table.outcome} IN ('failed', 'partiallyPublished', 'unconfirmed')`
      ),
    // A workspace's posts by creation, either way: ids are UUIDv7s.
    index("posts_workspace_id").on(table.workspaceId, table.id),
    // A workspace's drafts, newest first: ids are UUIDv7s.
    index("posts_workspace_drafts")
      .on(table.workspaceId, table.id)
      .where(sql`${table.status} = 'draft'`),
    // The posts a queue placed, by their time: the slots they take.
    index("posts_queue_scheduled_at")
      .on(table.queueId, table.scheduledAt)
      .where(sql`${table.queueId} is not null`),
    // A rule's posts, each occurrence once.
    uniqueIndex("posts_recycling_occurrence").on(
      table.recyclingId,
      table.occurrence
    ),
  ]
);

/**
 * A post on one channel. `round` goes up when the user sends it again, so a
 * job from an earlier round leaves it alone. `options` holds what the post
 * says there that only the channel's platform knows (a YouTube title, who
 * sees a TikTok post), tagged by `platform`, and is null on platforms that
 * take none: rows from before options were kept have none. `kept_private`
 * is true on a published target the platform made private although asked
 * to show it to more people, `thumbnail_not_set` on one that went live
 * without the thumbnail its options named. `content_digest` is the SHA-256 of what the
 * target sends to its channel (its text there and its media ids), written
 * when its post is scheduled, by which the same content sent to the same
 * channel again is found; null on a draft never scheduled, and on rows from
 * before it was kept. `live_parts` lists the parts of the post that
 * went live there, in order (each part's place, the platform's id and
 * address for it, and when: never content), kept from round to round;
 * empty on rows from before parts were kept. `platform_post_id` and
 * `permalink` are the first part's.
 */
export const postTargets = publishing.table(
  "post_targets",
  {
    cancelRequested: boolean("cancel_requested").notNull().default(false),
    channelId: uuid("channel_id").notNull(),
    contentDigest: text("content_digest"),
    // True on a target someone took off its post while the post waited
    // for its time: it is cancelled, and the post goes out on its other
    // channels.
    dropped: boolean("dropped").notNull().default(false),
    // When Peal last replaced the text of a part of it on the platform at
    // a member's request (`live_post_changes`). Null until then.
    editedAt: instant("edited_at"),
    failureCode: text("failure_code"),
    failureReason: text("failure_reason"),
    finishedAt: instant("finished_at"),
    id: uuid("id").primaryKey(),
    keptPrivate: boolean("kept_private").notNull().default(false),
    // When Peal knew the target live, for the contexts that follow
    // publications in that order: when it went out, or, for one a member
    // confirmed by hand, when they did. Null unless it is published.
    listedAt: instant("listed_at"),
    liveParts: jsonb("live_parts").notNull().default([]),
    options: jsonb("options"),
    permalink: text("permalink"),
    platformPostId: text("platform_post_id"),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    // When Peal deleted it from the platform at a member's request, every
    // part of it (`live_post_changes`); it stays published. Null while it
    // is there.
    removedAt: instant("removed_at"),
    round: integer("round").notNull().default(1),
    startedAt: instant("started_at"),
    status: text("status").notNull(),
    thumbnailNotSet: boolean("thumbnail_not_set").notNull().default(false),
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
      .on(table.listedAt, table.id)
      .where(sql`${table.status} = 'published'`),
  ]
);

/**
 * Every attempt at publishing a target, and what was decided after it: the
 * history support reads when a post went out late or not at all. `part` is
 * the place of the part the attempt sent, 0 for the post itself, as on
 * every row from before posts had parts.
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
    part: integer("part").notNull().default(0),
    retryDelayMillis: integer("retry_delay_millis"),
    round: integer("round").notNull(),
    startedAt: instant("started_at").notNull(),
    targetId: uuid("target_id")
      .notNull()
      .references(() => postTargets.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.targetId, table.round, table.part, table.attempt],
    }),
  ]
);

/**
 * The journal of calls to the platforms. A row is written, and committed,
 * before the call; `finished_at` and `outcome` once it answered. A row with
 * no `finished_at` is a call whose fate is unknown.
 *
 * One row per attempt at a part in a round, whatever its key: a second job
 * for the same attempt, as after a change to how keys are made, finds the
 * first one's call instead of sending again. `part` is the place of the
 * part the call sends, 0 for the post itself, as on every row from before
 * posts had parts.
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
    part: integer("part").notNull().default(0),
    progress: jsonb("progress"),
    round: integer("round").notNull(),
    startedAt: instant("started_at").notNull(),
    targetId: uuid("target_id")
      .notNull()
      .references(() => postTargets.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("publication_calls_target_round_part_attempt").on(
      table.targetId,
      table.round,
      table.part,
      table.attempt
    ),
  ]
);

/**
 * The changes members ask of posts that are live on a channel (deleting
 * them from the platform, or replacing the text of one of their parts),
 * each run by its own job (`ChangeLivePostV1`). `parts_left` lists the
 * parts still to delete or edit, last first, by place and platform id:
 * never content. `text` is an edit's new text, while the change is
 * pending only: cleared when it ends, done or failed, and never in the
 * job's history. `call_started_at` is written and committed
 * before each call to the platform, and `call_finished_at` once it
 * answered: a call begun and not ended is in flight, which an erasure
 * waits for. `requested_via` is the `PostOrigin` JSON the domain decodes
 * (persisted contract), `requested_by` the member (a Better Auth user
 * id), null for an API key and once they are forgotten. A target has one
 * pending change at most (`live_post_changes_pending`). Rows go with
 * their target.
 */
export const livePostChanges = publishing.table(
  "live_post_changes",
  {
    alreadyGone: boolean("already_gone").notNull().default(false),
    attempts: integer("attempts").notNull().default(0),
    callFinishedAt: instant("call_finished_at"),
    callStartedAt: instant("call_started_at"),
    channelId: uuid("channel_id").notNull(),
    failureCode: text("failure_code"),
    finishedAt: instant("finished_at"),
    id: uuid("id").primaryKey(),
    kind: text("kind").notNull(),
    partsLeft: jsonb("parts_left").notNull(),
    postId: uuid("post_id").notNull(),
    requestedAt: instant("requested_at").notNull(),
    requestedBy: uuid("requested_by"),
    requestedVia: jsonb("requested_via"),
    status: text("status").notNull(),
    targetId: uuid("target_id")
      .notNull()
      .references(() => postTargets.id, { onDelete: "cascade" }),
    text: text("text"),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // One change at a time on a target: requests sent together make one.
    uniqueIndex("live_post_changes_pending")
      .on(table.targetId)
      .where(sql`${table.status} = 'pending'`),
    // A post's changes, newest first: ids are UUIDv7s.
    index("live_post_changes_post").on(
      table.workspaceId,
      table.postId,
      table.id
    ),
    // The latest change of a target.
    index("live_post_changes_target").on(table.targetId, table.id),
  ]
);

/**
 * A resumable upload a platform keeps for one publishing call (YouTube's
 * videos.insert), journaled before any byte is sent, so a run found in
 * flight asks the platform where the upload stands instead of sending it
 * again. `session_url` is where the bytes go, cleared once the platform
 * made the video, whose id `video_id` then keeps; `final_part_sent` is set
 * before the part holding the last byte leaves, after which the video may
 * exist; `thumbnail_set` once the video's thumbnail is set, which a resumed
 * run does not set again. Rows go with their call.
 */
export const uploadSessions = publishing.table("upload_sessions", {
  byteSize: bigint("byte_size", { mode: "number" }).notNull(),
  finalPartSent: boolean("final_part_sent").notNull().default(false),
  idempotencyKey: text("idempotency_key")
    .primaryKey()
    .references(() => publicationCalls.idempotencyKey, { onDelete: "cascade" }),
  openedAt: instant("opened_at").notNull(),
  sessionUrl: text("session_url"),
  thumbnailSet: boolean("thumbnail_set").notNull().default(false),
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

/**
 * The labels a workspace files its posts under: a name, one per workspace
 * whatever its case (`name_key`), and a colour of the palette. Workspace
 * content, naming nobody; rows go with their workspace.
 */
export const tags = publishing.table(
  "tags",
  {
    colour: text("colour").notNull(),
    createdAt: instant("created_at").notNull(),
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    unique("tags_workspace_name").on(table.workspaceId, table.nameKey),
  ]
);

/**
 * The blocks of text a workspace keeps to end its posts with: a name, one
 * per workspace whatever its case (`name_key`), the text, and where it is
 * meant for (`scope`: `workspace`, `platform` with `scope_platform`, or
 * `channel` with `scope_channel_id`). `is_default` marks the one new posts
 * take in its scope when they ask for the defaults. Workspace content,
 * naming nobody; rows go with their workspace.
 */
export const signatures = publishing.table(
  "signatures",
  {
    createdAt: instant("created_at").notNull(),
    id: uuid("id").primaryKey(),
    isDefault: boolean("is_default").notNull().default(false),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    scope: text("scope").notNull(),
    scopeChannelId: uuid("scope_channel_id"),
    scopePlatform: text("scope_platform"),
    text: text("text").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    unique("signatures_workspace_name").on(table.workspaceId, table.nameKey),
  ]
);

/**
 * The selections of channels a workspace keeps under a name: the channels,
 * in the order chosen, and the options posts take on some of them (JSON
 * the domain's `ChannelOptionsListSchema` decodes). A channel disconnected
 * since stays listed: the set says so when it is read or used. Workspace
 * content, naming nobody; rows go with their workspace.
 */
export const channelSets = publishing.table(
  "channel_sets",
  {
    channelIds: uuid("channel_ids").array().notNull(),
    createdAt: instant("created_at").notNull(),
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    options: jsonb("options").notNull().default([]),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    unique("channel_sets_workspace_name").on(table.workspaceId, table.nameKey),
  ]
);

/**
 * A workspace's queues: weekly timetables a post is added to instead of
 * being given a time. `slots` is JSON the domain's `QueueSlotsSchema`
 * decodes (weekdays and wall-clock times), read in `time_zone`, an IANA
 * zone as written. `channel_ids` and `channel_set_id` are what a post
 * added to it goes to when it names none; a channel disconnected since
 * stays listed, and a deleted set is cleared in the transaction that
 * deletes it. `name_key` is the name as two names are compared, so a
 * workspace has one queue per name whatever its case, and one default
 * at most. Workspace content, naming nobody; rows go with their
 * workspace.
 */
export const queues = publishing.table(
  "queues",
  {
    channelIds: uuid("channel_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    channelSetId: uuid("channel_set_id"),
    createdAt: instant("created_at").notNull(),
    id: uuid("id").primaryKey(),
    isDefault: boolean("is_default").notNull().default(false),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    slots: jsonb("slots").notNull().default([]),
    timeZone: text("time_zone").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    unique("queues_workspace_name").on(table.workspaceId, table.nameKey),
    uniqueIndex("queues_workspace_default")
      .on(table.workspaceId)
      .where(sql`${table.isDefault}`),
    index("queues_workspace_id").on(table.workspaceId, table.id),
  ]
);

/**
 * The rules that make a post repeat (the domain's `RecyclingRule`): the
 * source post, the `interval` (JSON: a count of days, weeks or months),
 * the IANA zone its wall-clock times are read in and `anchor_at`, the
 * source's time, which every due instant is counted from; its ending
 * (`count` occurrences, the source counted, or the date `until`, or
 * neither); the text `variants` it takes turns with (JSON the domain's
 * `RecyclingVariantsSchema` decodes); the queue it places occurrences on,
 * if one. `status` is `active`, `paused` or `ended`, with `status_at`
 * (when it was paused or ended) and `ended_reason`. `made` counts the
 * occurrences made, the source as the first; `last_due_at` is the time the
 * latest one had, once past which the next is made, for `next_due_at`
 * (null once ended); `resumptions` counts the times it was resumed after
 * ending. `started_by` is the member who started it (null for a key, or
 * once they closed their account) and `started_via` how they reached Peal
 * (JSON the domain's `PostOriginSchema` decodes): each occurrence acts as
 * them. A source has one rule that has not ended. Workspace content, its
 * variants text the workspace wrote; rows go with their workspace. No
 * foreign key, as elsewhere here: a source or a queue gone ends the rule
 * at its next run.
 */
export const recyclingRules = publishing.table(
  "recycling_rules",
  {
    anchorAt: instant("anchor_at").notNull(),
    count: integer("count"),
    createdAt: instant("created_at").notNull(),
    endedReason: text("ended_reason"),
    id: uuid("id").primaryKey(),
    interval: jsonb("interval").notNull(),
    lastDueAt: instant("last_due_at").notNull(),
    made: integer("made").notNull(),
    nextDueAt: instant("next_due_at"),
    queueId: uuid("queue_id"),
    resumptions: integer("resumptions").notNull().default(0),
    sourcePostId: uuid("source_post_id").notNull(),
    startedBy: uuid("started_by"),
    startedVia: jsonb("started_via").notNull(),
    status: text("status").notNull(),
    statusAt: instant("status_at"),
    timeZone: text("time_zone").notNull(),
    until: date("until", { mode: "string" }),
    variants: jsonb("variants").notNull().default([]),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // One rule going on per source.
    uniqueIndex("recycling_rules_source")
      .on(table.sourcePostId)
      .where(sql`${table.status} <> 'ended'`),
    // The rules the cron makes an occurrence of, by when they are due.
    index("recycling_rules_due")
      .on(table.lastDueAt, table.id)
      .where(sql`${table.status} = 'active'`),
    // The active rules whose next occurrence is late, for the gauge.
    index("recycling_rules_next_due")
      .on(table.nextDueAt)
      .where(sql`${table.status} = 'active'`),
    // A workspace's rules, oldest first: ids are UUIDv7s.
    index("recycling_rules_workspace_id").on(table.workspaceId, table.id),
  ]
);

/**
 * The web feeds a workspace follows (the domain's `Feed`): the address it
 * reads (`url`, HTTPS, which may hold a token of the site's: logged by its
 * host only) and the title it last gave; the channels and the channel set
 * its posts go to (a set deleted since is cleared in the transaction that
 * deletes it); `mode`, `draft` or `queue`, with the queue it puts posts on
 * (`queue_id`, null for the workspace's default; a queue deleted since is
 * left, and the next run stops the feed); the `template` its posts are
 * written from, and whether they take the item's picture. `status` is
 * `active`, `paused` or `stopped`, with `status_at` and `stop_reason`.
 * `started_by` is the member who started it (null for a key, or once they
 * closed their account) and `started_via` how they reached Peal (JSON the
 * domain's `PostOriginSchema` decodes): its posts act as them. `etag` and
 * `last_modified` are the validators of its last read; `since` is when it
 * was added or its address last changed, before which no item is made;
 * `next_check_at` when it is read next; `failing_since` and
 * `last_failure` (a code) while its reads fail. Workspace content; rows go
 * with their workspace.
 */
export const feeds = publishing.table(
  "feeds",
  {
    attachPicture: boolean("attach_picture").notNull().default(false),
    channelIds: uuid("channel_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    channelSetId: uuid("channel_set_id"),
    createdAt: instant("created_at").notNull(),
    etag: text("etag"),
    failingSince: instant("failing_since"),
    id: uuid("id").primaryKey(),
    lastCheckedAt: instant("last_checked_at"),
    lastFailure: text("last_failure"),
    lastModified: text("last_modified"),
    mode: text("mode").notNull(),
    nextCheckAt: instant("next_check_at").notNull(),
    queueId: uuid("queue_id"),
    since: instant("since").notNull(),
    startedBy: uuid("started_by"),
    startedVia: jsonb("started_via").notNull(),
    status: text("status").notNull(),
    statusAt: instant("status_at"),
    stopReason: text("stop_reason"),
    template: text("template").notNull(),
    title: text("title"),
    updatedAt: instant("updated_at").notNull(),
    url: text("url").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // The feeds the cron reads, by when they are due.
    index("feeds_due")
      .on(table.nextCheckAt, table.id)
      .where(sql`${table.status} = 'active'`),
    // A workspace's feeds, oldest first: ids are UUIDv7s.
    index("feeds_workspace_id").on(table.workspaceId, table.id),
    check("feeds_mode", sql`${table.mode} IN ('draft', 'queue')`),
    check(
      "feeds_status",
      sql`${table.status} IN ('active', 'paused', 'stopped')`
    ),
  ]
);

/**
 * The items a feed read (the identity of each as its SHA-256, never its
 * text): when it was first seen, the date it gave, if one, and what was
 * made of it (`outcome`, with `reason`), with the post's id (no foreign
 * key: a draft discarded since leaves the item, which is never made
 * again). It keeps the 500 a read listed last, and every one the latest
 * read listed, so an item still listed is never made again; rows go with
 * their feed.
 */
export const feedItems = publishing.table(
  "feed_items",
  {
    feedId: uuid("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    itemAt: instant("item_at"),
    itemDigest: text("item_digest").notNull(),
    // When a read last listed it: retention keeps what the latest still lists.
    lastSeenAt: instant("last_seen_at").notNull(),
    outcome: text("outcome").notNull(),
    // Why the item's picture was not attached, when it was asked for.
    pictureSkipped: text("picture_skipped"),
    postId: uuid("post_id"),
    reason: text("reason"),
    seenAt: instant("seen_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.feedId, table.itemDigest] }),
    // A feed's items, newest first, for its page and its retention.
    index("feed_items_seen").on(table.feedId, table.seenAt),
  ]
);

/**
 * How many times a workspace's members had Peal read an address they
 * gave (a feed added, its address changed or resumed, a preview), by
 * hour on the hour (UTC): one statement adds to the hour's row, so reads
 * from every server take turns on it. Rows older than a day go with the
 * idempotency keys' retention.
 */
export const feedReads = publishing.table(
  "feed_reads",
  {
    reads: integer("reads").notNull(),
    windowStart: instant("window_start").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.windowStart] }),
    index("feed_reads_window_start").on(table.windowStart),
    check("feed_reads_reads", sql`${table.reads} > 0`),
  ]
);

/**
 * The options a workspace's new posts take on a channel when they give
 * none there (JSON the domain's `TargetOptionsSchema` decodes, tagged by
 * platform). Rows go with their workspace; one whose channel was
 * disconnected is read by nothing.
 */
export const channelDefaults = publishing.table(
  "channel_defaults",
  {
    channelId: uuid("channel_id").primaryKey(),
    options: jsonb("options").notNull(),
    updatedAt: instant("updated_at").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [index("channel_defaults_workspace").on(table.workspaceId)]
);
