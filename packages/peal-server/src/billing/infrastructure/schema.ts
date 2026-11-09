import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Like every context, billing keeps its tables in a Postgres schema of its
// own. Better Auth's Stripe plugin keeps its own subscription records in
// `auth`; these are what entitlements are computed from.
export const billing = pgSchema("billing");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * Each Stripe subscription a workspace has had, as the latest webhook event
 * about it left it: `last_event_at` is that event's time, so an older event
 * arriving late changes nothing. Deleting a workspace, which is refused
 * while one may still bill it, deletes its rows; Stripe keeps the customer
 * and its invoices.
 */
export const subscriptions = billing.table(
  "subscriptions",
  {
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull(),
    currentPeriodEnd: instant("current_period_end"),
    lastEventAt: instant("last_event_at").notNull(),
    lastEventId: text("last_event_id").notNull(),
    plan: text("plan").notNull(),
    status: text("status").notNull(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").primaryKey(),
    updatedAt: instant("updated_at").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [index("subscriptions_workspace").on(table.workspaceId)]
);

/**
 * The Stripe events recorded, by id, so one delivered again changes
 * nothing. Ids only: an event's content stays with Stripe.
 */
export const stripeEvents = billing.table("stripe_events", {
  id: text("id").primaryKey(),
  receivedAt: instant("received_at").notNull(),
});

/**
 * How many posts each workspace made on each platform that bills the
 * server per post, by calendar month (UTC, its first day), and how many of
 * them held a link: counts only, never a post. Publishing adds one in the
 * transaction that settles each post that went out. Deleting a workspace
 * deletes its rows.
 */
export const meteredPosts = billing.table(
  "metered_posts",
  {
    month: date("month", { mode: "date" }).notNull(),
    platform: text("platform").notNull(),
    posts: integer("posts").notNull(),
    postsWithLinks: integer("posts_with_links").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.platform, table.month] }),
    check(
      "metered_posts_counts",
      sql`${table.postsWithLinks} >= 0 AND ${table.postsWithLinks} <= ${table.posts}`
    ),
  ]
);
