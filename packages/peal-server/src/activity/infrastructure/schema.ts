import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Like every context, activity keeps its tables in a Postgres schema of its
// own. Instants are timestamptz written from the Clock (never NOW()), so
// tests control them.
export const activitySchema = pgSchema("activity");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * How many requests a credential sent in a window of the rate limit.
 * `subject` is the SHA-256 of what names the credential (a key's id, or an
 * application's and its user's), never the id itself: a row names nobody.
 * Rows are deleted an hour after their window (`activity.request-counts` cron).
 */
export const requestCounts = activitySchema.table(
  "request_counts",
  {
    requests: integer("requests").notNull(),
    subject: text("subject").notNull(),
    windowStart: instant("window_start").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subject, table.windowStart] }),
    index("request_counts_window_start").on(table.windowStart),
    check("request_counts_requests", sql`${table.requests} > 0`),
  ]
);

/**
 * The workspaces' activity logs: each request that asked to change
 * something, with who asked (`actor_kind`: a member, by `user_id`, or an
 * API key, by `api_key_id`), how they authenticated (`via`), the key or
 * the OAuth client it came through as it was called then, the operation
 * (an endpoint's or a tool's name), the ids its path named (`object_ids`,
 * an object of id names to ids), the status answered and the error's code.
 * Never what a request or its answer carried, an address or a user agent.
 * Ids without foreign keys: erasing a workspace deletes its rows, and
 * closing an account clears `user_id` and the application of the rows its
 * user made (ActivityRecords). Rows are deleted 90 days after they were
 * made (`activity.retention` cron). `actor_kind` and `via` are persisted
 * names: add values, never rename one.
 */
export const events = activitySchema.table(
  "events",
  {
    actorKind: text("actor_kind").notNull(),
    apiKeyId: text("api_key_id"),
    applicationId: text("application_id"),
    applicationName: text("application_name"),
    errorCode: text("error_code"),
    id: uuid("id").primaryKey(),
    impersonated: boolean("impersonated").notNull(),
    objectIds: jsonb("object_ids")
      .$type<Readonly<Record<string, string>>>()
      .notNull()
      .default({}),
    occurredAt: instant("occurred_at").notNull(),
    operation: text("operation").notNull(),
    requestId: text("request_id"),
    status: integer("status"),
    userId: uuid("user_id"),
    via: text("via").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    index("events_workspace").on(table.workspaceId, table.id),
    index("events_occurred_at").on(table.occurredAt),
    index("events_user").on(table.userId),
  ]
);
