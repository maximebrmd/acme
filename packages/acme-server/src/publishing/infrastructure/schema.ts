import {
  boolean,
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
 */
export const posts = publishing.table(
  "posts",
  {
    cancelledAt: instant("cancelled_at"),
    executionId: text("execution_id"),
    finishedAt: instant("finished_at"),
    id: uuid("id").primaryKey(),
    outcome: text("outcome"),
    scheduleRevision: integer("schedule_revision").notNull().default(0),
    scheduleZone: text("schedule_zone"),
    scheduledAt: instant("scheduled_at"),
    startedAt: instant("started_at"),
    status: text("status").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    index("posts_workspace_scheduled_at").on(
      table.workspaceId,
      table.scheduledAt
    ),
  ]
);

/**
 * A post on one channel. `round` goes up when the user sends it again, so a
 * job from an earlier round leaves it alone.
 */
export const postTargets = publishing.table(
  "post_targets",
  {
    cancelRequested: boolean("cancel_requested").notNull().default(false),
    channelId: uuid("channel_id").notNull(),
    failureCode: text("failure_code"),
    failureReason: text("failure_reason"),
    finishedAt: instant("finished_at"),
    id: uuid("id").primaryKey(),
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
 */
export const publicationCalls = publishing.table("publication_calls", {
  attempt: integer("attempt").notNull(),
  finishedAt: instant("finished_at"),
  idempotencyKey: text("idempotency_key").primaryKey(),
  operation: text("operation").notNull(),
  outcome: jsonb("outcome"),
  round: integer("round").notNull(),
  startedAt: instant("started_at").notNull(),
  targetId: uuid("target_id")
    .notNull()
    .references(() => postTargets.id, { onDelete: "cascade" }),
});
