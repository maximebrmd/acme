import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
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
