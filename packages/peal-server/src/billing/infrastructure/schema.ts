import {
  bigint,
  boolean,
  index,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
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
    currentPeriodStart: instant("current_period_start"),
    // How often it is paid for: `month` or `year`. Rows from before
    // yearly plans are monthly.
    interval: text("interval").notNull().default("month"),
    lastEventAt: instant("last_event_at").notNull(),
    lastEventId: text("last_event_id").notNull(),
    plan: text("plan").notNull(),
    startedAt: instant("started_at"),
    status: text("status").notNull(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").primaryKey(),
    trialEnd: instant("trial_end"),
    updatedAt: instant("updated_at").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    index("subscriptions_workspace").on(table.workspaceId),
    index("subscriptions_reminders").on(table.status, table.currentPeriodEnd),
  ]
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
 * Each order a member placed on the billing page before checkout: the plan
 * and interval, whether it is the trial, and the consent they gave, the
 * version of its words and when, which checkout then requires (used once,
 * within 30 minutes). The proof of the request to start at once and of the
 * withdrawal information (CRD art. 7(3), 8(8)). Deleting the workspace
 * deletes them; closing the account leaves them without the user.
 */
export const orders = billing.table(
  "orders",
  {
    consentVersion: text("consent_version").notNull(),
    createdAt: instant("created_at").notNull(),
    id: uuid("id").primaryKey(),
    interval: text("interval").notNull(),
    plan: text("plan").notNull(),
    trial: boolean("trial").notNull(),
    usedAt: instant("used_at"),
    userId: text("user_id"),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [index("orders_workspace").on(table.workspaceId)]
);

/**
 * The trials started, one per workspace and one per account. Deleting the
 * workspace leaves the account's row without it, and closing the account
 * leaves the workspace's without the user, so neither starts a second
 * trial; a row left with neither is deleted.
 */
export const trials = billing.table(
  "trials",
  {
    plan: text("plan").notNull(),
    startedAt: instant("started_at").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").primaryKey(),
    userId: text("user_id"),
    workspaceId: uuid("workspace_id"),
  },
  (table) => [
    uniqueIndex("trials_user").on(table.userId),
    uniqueIndex("trials_workspace").on(table.workspaceId),
  ]
);

/**
 * Each withdrawal a consumer made from a subscription within its 14 days:
 * when, by whom, and what was refunded, in cents of `currency`. Deleting the
 * workspace deletes them (Stripe keeps the refund); closing the account
 * leaves them without the user.
 */
export const withdrawals = billing.table(
  "withdrawals",
  {
    currency: text("currency").notNull(),
    refunded: bigint("refunded", { mode: "number" }).notNull(),
    requestedAt: instant("requested_at").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").primaryKey(),
    userId: text("user_id"),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [index("withdrawals_workspace").on(table.workspaceId)]
);
