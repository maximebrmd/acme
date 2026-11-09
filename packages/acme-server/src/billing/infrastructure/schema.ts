import {
  boolean,
  index,
  pgSchema,
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
 * arriving late changes nothing. A workspace keeps its rows when it is
 * deleted, as Stripe keeps the customer.
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
