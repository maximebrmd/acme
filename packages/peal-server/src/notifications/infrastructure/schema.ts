import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
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
 * `weekly_digest_week` is the week of the last weekly digest sent, by
 * its first day, `weekly_digest_lease` a send under way and
 * `weekly_digest_links` its unsubscribe links' generation: kept here, not
 * as a notice key, so they go with the account.
 */
export const notificationPreferences = notificationsSchema.table(
  "notification_preferences",
  {
    // A rule acting by itself that ended by itself, or follow-ups that did
    // not go out: on unless chosen.
    emailAutomations: boolean("email_automations").notNull().default(true),
    emailChannelReconnect: boolean("email_channel_reconnect").notNull(),
    // New comments under posts: off unless chosen.
    emailComments: boolean("email_comments").notNull().default(false),
    // A feed that stopped making posts: on unless chosen.
    emailFeedStopped: boolean("email_feed_stopped").notNull().default(true),
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
    // The weekly digest: off unless chosen.
    emailWeeklyDigest: boolean("email_weekly_digest").notNull().default(false),
    // The first day (UTC) of the last week a digest went out for, so a
    // week's goes once; null before the first. Gone with the row.
    weeklyDigestWeek: date("weekly_digest_week", { mode: "string" }),
    // When a send of the digest took it, while it is under way: another
    // run leaves it until the lease is stale. Null otherwise.
    weeklyDigestLease: instant("weekly_digest_lease"),
    // The generation of the digest's unsubscribe links: each is signed
    // with it, and turning the digest on again moves it, so the links
    // sent before stop working.
    weeklyDigestLinks: integer("weekly_digest_links").notNull().default(0),
    everyPost: boolean("every_post").notNull().default(false),
    updatedAt: instant("updated_at").notNull(),
    userId: uuid("user_id").primaryKey(),
  },
  (table) => [
    // Those who asked for the weekly digest, by id, which its run pages
    // through: few of all users, so the index stays small.
    index("notification_preferences_weekly_digest")
      .on(table.userId)
      .where(sql`${table.emailWeeklyDigest}`),
  ]
);
