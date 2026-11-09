import { pgSchema, text, timestamp } from "drizzle-orm/pg-core";

// The notifications context's tables, in their own Postgres schema.
export const notificationsSchema = pgSchema("notifications");

/**
 * The notices sent, by the key of the event that caused each, so an event
 * seen again (by a retried job, or the daily check) sends nothing more.
 * Keys name events, such as `channel:<id>:reconnect-required:<since>`; they
 * hold ids and instants only, never content.
 */
export const sentNotices = notificationsSchema.table("sent_notices", {
  key: text("key").primaryKey(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
});
