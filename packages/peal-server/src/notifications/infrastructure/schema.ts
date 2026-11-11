import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// The notifications context's tables, in their own Postgres schema. Instants
// are timestamptz written from the Clock (never NOW()), so tests control them.
export const notificationsSchema = pgSchema("notifications");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * The events notified, by the key of each, so an event seen again (by a
 * retried job, or the daily check) notifies nobody more. Keys name events,
 * such as `channel:<id>:reconnect-required:<since>`; they hold ids and
 * instants only, never content.
 */
export const sentNotices = notificationsSchema.table("sent_notices", {
  key: text("key").primaryKey(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
});

/**
 * One row per member an event concerns: what happened, as the event's data
 * (ids, a channel's platform and handle, reasons: never a post's content),
 * whether they read it, and where its email is.
 *
 * - `kind` is the event's tag, for queries by hand; `event` holds it all.
 * - `email_status`: `none` (not wanted), `pending`, `sent`, `failed` or
 *   `skipped` (the member left the workspace, or no longer wanted it).
 */
export const notices = notificationsSchema.table(
  "notices",
  {
    createdAt: instant("created_at").notNull(),
    emailSettledAt: instant("email_settled_at"),
    emailStatus: text("email_status").notNull(),
    event: jsonb("event").notNull(),
    eventKey: text("event_key").notNull(),
    id: uuid("id").primaryKey(),
    kind: text("kind").notNull(),
    readAt: instant("read_at"),
    userId: uuid("user_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // Also how an event's pending emails are found.
    unique("notices_event_user").on(table.eventKey, table.userId),
    // A user's notices, newest first: ids are UUIDv7s, in creation order.
    index("notices_user").on(table.userId, table.id),
    index("notices_user_unread")
      .on(table.userId)
      .where(sql`${table.readAt} IS NULL`),
  ]
);

/**
 * The preferences of the users who changed them; the others have the
 * defaults (`defaultPreferences` in the domain). `every_post`: they hear
 * about every post of their workspaces, not only those they wrote.
 */
export const notificationPreferences = notificationsSchema.table(
  "notification_preferences",
  {
    emailChannelReconnect: boolean("email_channel_reconnect").notNull(),
    // New comments under posts: off unless chosen.
    emailComments: boolean("email_comments").notNull().default(false),
    emailPostFailed: boolean("email_post_failed").notNull(),
    emailPostPublished: boolean("email_post_published").notNull(),
    // Comments on posts, approvals asked for and decided: on unless chosen.
    emailPostReview: boolean("email_post_review").notNull().default(true),
    emailPostUnconfirmed: boolean("email_post_unconfirmed").notNull(),
    // A recycling rule that ended: on unless chosen.
    emailRecyclingEnded: boolean("email_recycling_ended")
      .notNull()
      .default(true),
    // Deliveries to a webhook endpoint failing for good: on unless chosen.
    emailWebhookFailing: boolean("email_webhook_failing")
      .notNull()
      .default(true),
    everyPost: boolean("every_post").notNull().default(false),
    updatedAt: instant("updated_at").notNull(),
    userId: uuid("user_id").primaryKey(),
  }
);
