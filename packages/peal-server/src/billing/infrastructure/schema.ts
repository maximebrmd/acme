import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
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
    // When Stripe is set to end it, when on a day of its own.
    cancelAt: instant("cancel_at"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull(),
    currentPeriodEnd: instant("current_period_end"),
    currentPeriodStart: instant("current_period_start"),
    // How often it is paid for: `month` or `year`. Rows from before
    // yearly plans are monthly.
    interval: text("interval").notNull().default("month"),
    lastEventAt: instant("last_event_at").notNull(),
    lastEventId: text("last_event_id").notNull(),
    // When the reporter first found an invoice of it paid that took
    // something: per-account pricing's ceiling before then lifts.
    paidInvoiceAt: instant("paid_invoice_at"),
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

/**
 * Each workspace's usage ledger: a meter's quantity on a day (UTC), by
 * dimension (the platform of `publishedPosts`, empty for the others; see
 * `billing/domain/usage-meter.ts`). Counts and ids only, never a post, a
 * name or an address. A new meter is a new `meter` value, not a new
 * column. Rows are kept 400 days (`usageRetentionDays`), the `day` index
 * serving the daily purge; deleting a workspace deletes its rows.
 */
export const usageDays = billing.table(
  "usage_days",
  {
    day: date("day", { mode: "date" }).notNull(),
    dimension: text("dimension").notNull().default(""),
    meter: text("meter").notNull(),
    quantity: bigint("quantity", { mode: "number" }).notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.workspaceId, table.day, table.meter, table.dimension],
    }),
    index("usage_days_day").on(table.day),
    check("usage_days_quantity", sql`${table.quantity} >= 0`),
  ]
);

/**
 * Each order a member placed on the billing page before checkout: the plan
 * and interval, whether it is the trial, and the consent they gave, the
 * version of its words and when, which checkout then requires (used once,
 * within 30 minutes). The proof of the request to start at once and of the
 * withdrawal information (CRD art. 7(3), 8(8)). Closing the account leaves
 * them without the user. Erasing the workspace leaves those of a workspace
 * that had a subscription without it, by the Stripe customer that holds its
 * invoices, from `erased_at`, for 5 years (`contractRetention`), and
 * deletes the others, which no contract followed.
 */
export const orders = billing.table(
  "orders",
  {
    consentVersion: text("consent_version").notNull(),
    createdAt: instant("created_at").notNull(),
    erasedAt: instant("erased_at"),
    id: uuid("id").primaryKey(),
    interval: text("interval").notNull(),
    plan: text("plan").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    trial: boolean("trial").notNull(),
    usedAt: instant("used_at"),
    userId: text("user_id"),
    workspaceId: uuid("workspace_id"),
  },
  (table) => [
    index("orders_workspace").on(table.workspaceId),
    index("orders_user").on(table.userId),
    index("orders_erased").on(table.erasedAt),
  ]
);

/**
 * The trials started, one per workspace and one per account, and the holds
 * of trial checkouts under way (no subscription yet), which the unique
 * indexes keep to one too. Deleting the workspace leaves the account's row
 * without it, and closing the account leaves the workspace's without the
 * user, with a keyed pseudonym of its email address instead
 * (`user_pseudonym`, from `forgotten_at`, for `trialMemory`), so neither
 * the workspace nor the same address signing up again starts a second
 * trial; a row left with neither is deleted.
 */
export const trials = billing.table(
  "trials",
  {
    forgottenAt: instant("forgotten_at"),
    id: uuid("id").primaryKey().defaultRandom(),
    plan: text("plan"),
    reservedAt: instant("reserved_at").notNull(),
    startedAt: instant("started_at"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    userId: text("user_id"),
    userPseudonym: text("user_pseudonym"),
    workspaceId: uuid("workspace_id"),
  },
  (table) => [
    index("trials_pseudonym").on(table.userPseudonym),
    uniqueIndex("trials_subscription").on(table.stripeSubscriptionId),
    uniqueIndex("trials_user").on(table.userId),
    uniqueIndex("trials_workspace").on(table.workspaceId),
  ]
);

/**
 * Each withdrawal a consumer made from a subscription within its 14 days:
 * when, by whom, and what was refunded, in cents of `currency`. Closing the
 * account leaves them without the user; erasing the workspace leaves them
 * without it, by their Stripe subscription, from `erased_at`, for 5 years
 * (`contractRetention`).
 */
export const withdrawals = billing.table(
  "withdrawals",
  {
    currency: text("currency").notNull(),
    erasedAt: instant("erased_at"),
    refunded: bigint("refunded", { mode: "number" }).notNull(),
    requestedAt: instant("requested_at").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").primaryKey(),
    userId: text("user_id"),
    workspaceId: uuid("workspace_id"),
  },
  (table) => [
    index("withdrawals_workspace").on(table.workspaceId),
    index("withdrawals_user").on(table.userId),
    index("withdrawals_erased").on(table.erasedAt),
  ]
);

/**
 * Each request to cancel a contract or to withdraw from it, as it was
 * received: from a member in session, or from the form anyone reaches
 * without signing in, with what its sender wrote there (their name, the
 * address to acknowledge it at, the contract). `received_at` is the day
 * that counts, whenever it is applied. `confirmation_digest` is the SHA-256
 * of the token of the link sent to an address that manages a contract.
 * Closing the account leaves its requests without the user, the name and
 * the address; erasing the workspace leaves them without it, from
 * `erased_at`, for 5 years (`contractRetention`), as long as those no
 * contract was found for stay from `received_at`.
 */
export const contractRequests = billing.table(
  "contract_requests",
  {
    acknowledgedAt: instant("acknowledged_at"),
    acknowledgement: text("acknowledgement").notNull(),
    channel: text("channel").notNull(),
    confirmationDigest: text("confirmation_digest"),
    confirmationExpiresAt: instant("confirmation_expires_at"),
    contract: text("contract"),
    currency: text("currency"),
    desiredAt: instant("desired_at"),
    effectiveAt: instant("effective_at"),
    email: text("email"),
    erasedAt: instant("erased_at"),
    id: uuid("id").primaryKey(),
    intent: jsonb("intent"),
    kind: text("kind").notNull(),
    locale: text("locale").notNull(),
    name: text("name"),
    receivedAt: instant("received_at").notNull(),
    refunded: bigint("refunded", { mode: "number" }),
    refusal: text("refusal"),
    settledAt: instant("settled_at"),
    status: text("status").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id"),
    userId: text("user_id"),
    workspaceId: uuid("workspace_id"),
  },
  (table) => [
    index("contract_requests_workspace").on(table.workspaceId),
    index("contract_requests_user").on(table.userId),
    index("contract_requests_status").on(table.status, table.receivedAt),
    index("contract_requests_email").on(table.email, table.acknowledgedAt),
    index("contract_requests_erased").on(table.erasedAt),
    uniqueIndex("contract_requests_confirmation").on(table.confirmationDigest),
  ]
);

/**
 * The contract number of each subscription whose members were given one,
 * so a number finds its subscription. A keyed hash of the subscription's
 * id: it names nobody. Erasing the workspace deletes its rows.
 */
export const contractReferences = billing.table(
  "contract_references",
  {
    issuedAt: instant("issued_at").notNull(),
    reference: text("reference").primaryKey(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [index("contract_references_workspace").on(table.workspaceId)]
);

/**
 * Each billing account: a person who pays for the workspaces they made
 * (`payer_user_id`), or a partner, for its home workspace and those it owns
 * (`partner_id`). Its workspaces share its plan and its channels. The
 * billing workspace (`holder_workspace_id`) carries the Stripe customer and
 * the subscription, as a workspace does on its own. `standalone` is a
 * workspace a plan subscription of its own keeps alone, until it ends: a
 * person has one account that is not standalone at most. `free_tier`
 * false is staff requiring a payment method. Ids only: no name, no
 * address. Closing the payer's account and erasing its last workspace
 * delete it.
 */
export const accounts = billing.table(
  "accounts",
  {
    createdAt: instant("created_at").notNull(),
    freeTier: boolean("free_tier").notNull().default(true),
    holderWorkspaceId: uuid("holder_workspace_id").notNull().unique(),
    id: uuid("id").primaryKey(),
    partnerId: uuid("partner_id"),
    payerUserId: text("payer_user_id"),
    standalone: boolean("standalone").notNull().default(false),
  },
  (table) => [
    uniqueIndex("accounts_payer")
      .on(table.payerUserId)
      .where(
        sql`${table.payerUserId} IS NOT NULL AND ${table.standalone} = false`
      ),
    index("accounts_payer_user").on(table.payerUserId),
    uniqueIndex("accounts_partner")
      .on(table.partnerId)
      .where(sql`${table.partnerId} IS NOT NULL`),
  ]
);

/**
 * The billing account each workspace belongs to, one each. Written the
 * first time the workspace is read or made; erasing the workspace deletes
 * its row.
 */
export const accountWorkspaces = billing.table(
  "account_workspaces",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    attachedAt: instant("attached_at").notNull(),
    // Put there by staff merging accounts: kept whoever owns it, until
    // staff detach it.
    merged: boolean("merged").notNull().default(false),
    // Who paid for it before the merge, to whom detaching gives it back
    // while they still own it.
    mergedFromPayer: text("merged_from_payer"),
    workspaceId: uuid("workspace_id").primaryKey(),
  },
  (table) => [index("account_workspaces_account").on(table.accountId)]
);

/**
 * A payment method staff required of a person, whatever billing accounts
 * they pay for, made or deleted: by their user id while the account is
 * open, then by a keyed pseudonym of its email address once it is closed
 * (`user_id` null), so signing up again with the address keeps it, until
 * `forgotten_at` is past `requirementMemory`. Giving the free tier back
 * deletes it.
 */
export const paymentRequirements = billing.table(
  "payment_requirements",
  {
    forgottenAt: instant("forgotten_at"),
    id: uuid("id").primaryKey(),
    requiredAt: instant("required_at").notNull(),
    userId: text("user_id"),
    userPseudonym: text("user_pseudonym"),
  },
  (table) => [
    uniqueIndex("payment_requirements_user").on(table.userId),
    index("payment_requirements_pseudonym").on(table.userPseudonym),
  ]
);

/**
 * A workspace its payer offered to another of its owners, not yet taken:
 * one at a time per workspace, until `expires_at`. Taking it, withdrawing
 * it, erasing the workspace and closing either account delete it.
 */
export const accountTransfers = billing.table(
  "account_transfers",
  {
    expiresAt: instant("expires_at").notNull(),
    fromAccountId: uuid("from_account_id")
      .notNull()
      .references(() => accounts.id),
    id: uuid("id").primaryKey(),
    offeredAt: instant("offered_at").notNull(),
    offeredBy: text("offered_by").notNull(),
    toUserId: text("to_user_id").notNull(),
    workspaceId: uuid("workspace_id").notNull().unique(),
  },
  (table) => [
    index("account_transfers_from").on(table.fromAccountId),
    index("account_transfers_to").on(table.toUserId),
    index("account_transfers_by").on(table.offeredBy),
  ]
);

/**
 * When this server first ran with each billing grace
 * (`PEAL_BILLING_GRACE_UNTIL`, its day the key): only the channels
 * connected before then are graced, never one connected after. Written
 * once, the first time a server that bills starts with that day.
 */
export const graceStarts = billing.table("grace_starts", {
  graceUntil: date("grace_until", { mode: "string" }).primaryKey(),
  startedAt: instant("started_at").notNull(),
});

/**
 * Each billing account's connected accounts by UTC day, on its billing
 * workspace (the holder): the most connected at once that day across its
 * workspaces (`peak`, raised by each connection and written when the day
 * starts; a disconnection lowers nothing), and how many of the day's
 * account-days were put in the outbox to Stripe (`reported`, at most what
 * the day bills: none on the 31st). Counts and ids only. Kept 400 days,
 * the `day` index serving the purge; erasing the workspace deletes its
 * rows.
 */
export const accountDays = billing.table(
  "account_days",
  {
    day: date("day", { mode: "date" }).notNull(),
    holderWorkspaceId: uuid("holder_workspace_id").notNull(),
    peak: integer("peak").notNull(),
    reported: integer("reported").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.holderWorkspaceId, table.day] }),
    index("account_days_day").on(table.day),
    check(
      "account_days_counts",
      sql`${table.reported} >= 0 AND ${table.reported} <= ${table.peak}`
    ),
  ]
);

/**
 * The outbox of usage to Stripe: one row per meter event, written in the
 * transaction that changed the count it reports, its `identifier` derived
 * from that fact (Stripe's event identifier), so the same fact never makes
 * two rows. The reporter stamps a row at its first attempt, sends unsent
 * rows oldest first and marks them sent; one Stripe refused for good keeps
 * its error code in `refusal`, as does one Stripe took and then reported
 * an error of (`stripe:<code>`, from its meter error events).
 * A meter's units given back after they were reported write a row of a
 * negative value. Ids and counts only. Deleted 400 days after it was sent
 * (or written, never sent), and with the workspace.
 */
export const meterReports = billing.table(
  "meter_reports",
  {
    createdAt: instant("created_at").notNull(),
    eventName: text("event_name").notNull(),
    holderWorkspaceId: uuid("holder_workspace_id").notNull(),
    identifier: text("identifier").primaryKey(),
    occurredAt: instant("occurred_at").notNull(),
    refusal: text("refusal"),
    sentAt: instant("sent_at"),
    // The timestamp the event is sent with, fixed at its first attempt
    // and sent again unchanged, so a retry is the same request.
    stampedAt: instant("stamped_at"),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    value: bigint("value", { mode: "number" }).notNull(),
  },
  (table) => [
    index("meter_reports_unsent")
      .on(table.createdAt)
      .where(sql`${table.sentAt} IS NULL`),
    index("meter_reports_sent").on(table.sentAt),
    // Those Stripe refused, before or after it took them: few, read each
    // run.
    index("meter_reports_refused")
      .on(table.createdAt)
      .where(sql`${table.refusal} IS NOT NULL`),
    index("meter_reports_holder").on(table.holderWorkspaceId),
    // A fall is reported as a negative value: Stripe sums a meter's
    // events, and bills a period whose sum is negative as none.
    check("meter_reports_value", sql`${table.value} <> 0`),
  ]
);

/**
 * Each billing account's meters by calendar month (UTC), on its billing
 * workspace (the holder): the units its workspaces used (`used`), the
 * units past the allowance put in the outbox to Stripe (`reported`, for a
 * holder that pays per-account pricing only), and how many meter events
 * the row made (`events`, which names the next one). Counts and ids only.
 * Kept 400 days; erasing the workspace deletes its rows.
 */
export const meterUsage = billing.table(
  "meter_usage",
  {
    events: bigint("events", { mode: "number" }).notNull().default(0),
    // Units given back for a failure this month: free up to the meter's
    // allowance, counted past it.
    forgiven: bigint("forgiven", { mode: "number" }).notNull().default(0),
    holderWorkspaceId: uuid("holder_workspace_id").notNull(),
    meter: text("meter").notNull(),
    month: date("month", { mode: "date" }).notNull(),
    reported: bigint("reported", { mode: "number" }).notNull().default(0),
    used: bigint("used", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.holderWorkspaceId, table.month, table.meter],
    }),
    index("meter_usage_month").on(table.month),
    check(
      "meter_usage_counts",
      sql`${table.used} >= 0 AND ${table.reported} >= 0 AND ${table.events} >= 0 AND ${table.forgiven} >= 0`
    ),
  ]
);

/**
 * What a billing account spends past a group's allowances a month at
 * most (`assistant`, `x`), in cents of `currency`, set on its billing
 * workspace by a member with billing:manage. No row: the rate card's
 * default. It names nobody: the activity log keeps who set it. Erasing
 * the workspace deletes its rows.
 */
export const spendCeilings = billing.table(
  "spend_ceilings",
  {
    cents: bigint("cents", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    group: text("group").notNull(),
    holderWorkspaceId: uuid("holder_workspace_id").notNull(),
    setAt: instant("set_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.holderWorkspaceId, table.group] }),
    check("spend_ceilings_cents", sql`${table.cents} >= 0`),
  ]
);

/**
 * Whether a workspace reads its X channels' counts on a server that bills
 * (X bills each read, passed through at its rates): off unless a member
 * who manages its billing turned it on. The row names nobody; the
 * activity log keeps who. No row is off.
 */
export const xUsageSettings = billing.table("x_usage_settings", {
  reads: boolean("reads").notNull().default(false),
  setAt: instant("set_at").notNull(),
  workspaceId: uuid("workspace_id").primaryKey(),
});
