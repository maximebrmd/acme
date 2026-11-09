import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  pgSchema,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";

// Like every context, the assistant keeps its tables in a Postgres schema of
// its own.
export const assistant = pgSchema("assistant");

// How many requests each workspace sent the assistant on each UTC day: the
// daily quota reads today's row, and billing can read them all. A row holds
// counts only, never what was asked or answered.
export const dailyUsage = assistant.table(
  "daily_usage",
  {
    day: date("day", { mode: "string" }).notNull(),
    requests: integer("requests").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.day] }),
    check("daily_usage_requests", sql`${table.requests} >= 0`),
  ]
);
