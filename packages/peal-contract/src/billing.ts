import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import {
  BillingIntervalSchema,
  MoneySchema,
  OrderablePlanSchema,
  PaidPlanSchema,
  PlanSchema,
} from "./billing-plans.ts";
import { Forbidden } from "./forbidden.ts";
import { ByteCountSchema, Int64Schema } from "./int64.ts";
import { MeterSchema, RateCardSchema, UnitPriceSchema } from "./rate-card.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

// Null for no limit.
const allowance = Schema.NullOr(Int64Schema);

/**
 * What a plan allows a workspace, limit by limit; null for no limit.
 * `mediaStorage` is in bytes.
 */
export const PlanAllowancesSchema = Schema.Struct({
  assistantRequests: allowance,
  channels: allowance,
  mediaStorage: allowance,
  members: allowance,
  scheduledPosts: allowance,
}).annotate({ identifier: "PlanAllowances" });

export type PlanAllowances = typeof PlanAllowancesSchema.Type;

/** A paid plan's prices, in cents of `Billing.currency`, excluding VAT. */
export const PlanPriceSchema = Schema.Struct({
  month: Schema.Int,
  year: Schema.Int,
}).annotate({ identifier: "PlanPrice" });

export type PlanPrice = typeof PlanPriceSchema.Type;

/** A plan, what it allows, and its prices (null for the free plan). */
export const PlanOfferSchema = Schema.Struct({
  allowances: PlanAllowancesSchema,
  plan: PlanSchema,
  price: Schema.NullOr(PlanPriceSchema),
}).annotate({ identifier: "PlanOffer" });

export type PlanOffer = typeof PlanOfferSchema.Type;

/** Where a subscription stands, as Stripe names it. */
export const SubscriptionStatusSchema = Schema.Literals([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]).annotate({ identifier: "SubscriptionStatus" });

export type SubscriptionStatus = typeof SubscriptionStatusSchema.Type;

/** The subscription that buys the workspace its plan. */
export const BillingSubscriptionSchema = Schema.Struct({
  // Whether it ends when the period paid for does.
  cancelAtPeriodEnd: Schema.Boolean,
  // When the period paid for ends: the next payment, or the end.
  currentPeriodEnd: Schema.NullOr(Schema.DateTimeUtc),
  // When it ends, once it is set to end: with the period paid for, or on
  // the later day its cancellation asked for. Null while it renews.
  endsAt: Schema.NullOr(Schema.DateTimeUtc),
  // How often it is paid for.
  interval: BillingIntervalSchema,
  plan: PaidPlanSchema,
  // When the contract started, the trial's first day for a trial.
  startedAt: Schema.NullOr(Schema.DateTimeUtc),
  status: SubscriptionStatusSchema,
  // When its trial ends, for a subscription that started with one.
  trialEnd: Schema.NullOr(Schema.DateTimeUtc),
}).annotate({ identifier: "BillingSubscription" });

export type BillingSubscription = typeof BillingSubscriptionSchema.Type;

/** A count that starts again from zero at `resetsAt`. */
export const PeriodUsageSchema = Schema.Struct({
  resetsAt: Schema.DateTimeUtc,
  used: Schema.Int,
}).annotate({ identifier: "PeriodUsage" });

export type PeriodUsage = typeof PeriodUsageSchema.Type;

/** How much of each limit the workspace uses now. */
export const UsageSchema = Schema.Struct({
  // Today (UTC).
  assistantRequests: PeriodUsageSchema,
  channels: Schema.Int,
  // Bytes of media stored, uploads in progress included.
  mediaStorage: ByteCountSchema,
  members: Schema.Int,
  // Going out this month (UTC).
  scheduledPosts: PeriodUsageSchema,
}).annotate({ identifier: "Usage" });

export type Usage = typeof UsageSchema.Type;

/**
 * The trial a workspace could start once, without a payment method. No new
 * trial is offered: `available` is false, the free accounts replace it.
 */
export const TrialOfferSchema = Schema.Struct({
  // Whether the member asking may start it for this workspace now.
  available: Schema.Boolean,
  days: Schema.Int,
  plan: PaidPlanSchema,
}).annotate({ identifier: "TrialOffer" });

export type TrialOffer = typeof TrialOfferSchema.Type;

/** An offer to hand a workspace to another payer, not yet taken. */
export const BillingTransferSchema = Schema.Struct({
  // When the offer lapses: 7 days after it was made.
  expiresAt: Schema.DateTimeUtc,
  offeredAt: Schema.DateTimeUtc,
  // The payer who offered it.
  offeredBy: Schema.String,
  // The other owner of the workspace who becomes its payer by accepting.
  toUserId: Schema.String,
}).annotate({ identifier: "BillingTransfer" });

export type BillingTransfer = typeof BillingTransferSchema.Type;

/** Another workspace of the same billing account. */
export const AccountWorkspaceSchema = Schema.Struct({
  name: Schema.String,
  workspaceId: Schema.String,
}).annotate({ identifier: "AccountWorkspace" });

export type AccountWorkspace = typeof AccountWorkspaceSchema.Type;

/**
 * The billing account a workspace is on: who pays for it, a person (the
 * one who made it, or who took it over) or a partner, across every
 * workspace of the account, which share one plan and count their channels
 * together. The billing workspace holds the subscription.
 */
export const BillingAccountSchema = Schema.Struct({
  // The workspace that bills the account: its plan is ordered there.
  billingWorkspaceId: Schema.String,
  // Its name, for a member of it; null for anyone else.
  billingWorkspaceName: Schema.NullOr(Schema.String),
  id: Schema.String,
  // The account's other workspaces that the reader is a member of.
  otherWorkspaces: Schema.Array(AccountWorkspaceSchema),
  // Whether the account is a partner's: its home workspace and the
  // workspaces it owns.
  partner: Schema.Boolean,
  // Whether the reader pays for the account.
  payer: Schema.Boolean,
  // The open offer to hand this workspace to another payer, shown to the
  // payer and to the owner it is offered to; null otherwise.
  transfer: Schema.NullOr(BillingTransferSchema),
  // How many workspaces the account holds, this one included.
  workspaces: Schema.Int,
}).annotate({ identifier: "BillingAccount" });

export type BillingAccount = typeof BillingAccountSchema.Type;

/**
 * The connected accounts of a workspace's billing account this calendar
 * month (UTC), which per-account pricing bills: each day counts the most
 * accounts connected at once across the account's workspaces, for days 1
 * to 30 (the 31st is free), and the month's account-days go through the
 * rate card's ladder. The money is US dollar cents excluding tax, null on
 * a server that does not bill.
 */
export const BillingAccountsUsageSchema = Schema.Struct({
  // The month's account-days so far, today's included; null on a server
  // that does not bill, which counts none.
  accountDays: Schema.NullOr(Int64Schema),
  // The accounts this workspace connected itself.
  connected: Schema.Int,
  // What the month's account-days cost so far, by the ladder.
  estimate: Schema.NullOr(MoneySchema),
  // What one more account would cost a month, at the band it falls in.
  nextAccount: Schema.NullOr(MoneySchema),
  // The accounts connected across the billing account's workspaces.
  pooled: Schema.Int,
}).annotate({ identifier: "BillingAccountsUsage" });

export type BillingAccountsUsage = typeof BillingAccountsUsageSchema.Type;

/**
 * The groups of meters a billing account bounds with a monthly ceiling of
 * its own: the writing assistant's requests and images together
 * (`assistant`), and X's API (`x`).
 */
export const SpendGroupSchema = Schema.Literals(["assistant", "x"]).annotate({
  identifier: "SpendGroup",
});

export type SpendGroup = typeof SpendGroupSchema.Type;

/**
 * A meter of the billing account this calendar month (UTC), across its
 * workspaces: what the month includes (`allowance`), what was used, the
 * units past the allowance billed (for an account that pays), what they
 * cost so far, the most it may use, its price past the allowance and its
 * ceiling. Without a payment method, the meter pauses at its allowance
 * until `resetsAt`.
 */
export const BillingMeterSchema = Schema.Struct({
  allowance: Schema.Int,
  // The units past the allowance billed this month: none without a
  // payment method, which never passes it.
  billable: Schema.Int,
  // The most the account spends past the allowance a month, for a meter
  // whose group has a ceiling (`group`); null for none.
  ceiling: Schema.NullOr(MoneySchema),
  // What `billable` costs so far, excluding tax; null for a workspace
  // that does not bill the account.
  estimate: Schema.NullOr(MoneySchema),
  // The group whose ceiling bounds the meter; null for none.
  group: Schema.NullOr(SpendGroupSchema),
  meter: MeterSchema,
  // The most units the account may use this month; null for no end.
  most: Schema.NullOr(Schema.Int),
  // What units past the allowance cost: `cents` for every `per`.
  price: UnitPriceSchema,
  // Whether the owner confirmed the allowance and the price; when false
  // they are placeholders, shown as coming.
  priceConfirmed: Schema.Boolean,
  // The first of next month, 00:00 UTC, when the meter counts from zero.
  resetsAt: Schema.DateTimeUtc,
  used: Schema.Int,
}).annotate({ identifier: "BillingMeter" });

export type BillingMeter = typeof BillingMeterSchema.Type;

/** What a member set a group's ceiling to. */
export const SpendCeilingPayloadSchema = Schema.Struct({
  // US dollar cents excluding tax, a month, past the allowances.
  cents: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
}).annotate({ identifier: "SpendCeilingPayload" });

export type SpendCeilingPayload = typeof SpendCeilingPayloadSchema.Type;

/** A billing account's ceiling on a group of meters. */
export const SpendCeilingSchema = Schema.Struct({
  ceiling: MoneySchema,
  group: SpendGroupSchema,
  setAt: Schema.DateTimeUtc,
}).annotate({ identifier: "SpendCeiling" });

export type SpendCeiling = typeof SpendCeilingSchema.Type;

/**
 * A workspace's billing. On a server that bills, a workspace is on the
 * free tier (`free`: 2 connected accounts across its billing account, no
 * payment method) or on per-account pricing (`payAsYouGo`: a payment
 * method, each account past the free ones and each use past its allowance
 * billed monthly at the rate card's prices); a subscription to a plan
 * priced by tiers of channels keeps its plan until it ends. On a server
 * that does not bill, `enabled` is false, `plan`, `subscription`, `trial`
 * and `withdrawableUntil` are null, every allowance is null and `plans` is
 * empty: nothing is limited. A workspace whose billing account another of
 * its workspaces bills (a partner's customer, a person's other workspaces)
 * shares that account's plan, and reads its pool and limits as its usage
 * does (`accounts.pooled`, `usage`, `allowances`), but none of its money
 * or contract: `subscription`, `withdrawableUntil`, `estimate`,
 * `upcomingInvoice` and the month's figures are null, and `paymentFailed`
 * false. `account.billingWorkspaceId` names the workspace that bills.
 */
export const BillingSchema = Schema.Struct({
  // The billing account the workspace is on, on a server that does not
  // bill too. Older servers leave it out.
  account: Schema.optionalKey(BillingAccountSchema),
  // The billing account's connected accounts this month, and their cost.
  accounts: BillingAccountsUsageSchema,
  allowances: PlanAllowancesSchema,
  // The currency of the prices of the plans priced by tiers of channels.
  // Per-account pricing is in US dollars (`peal-contract/rate-card`).
  currency: Schema.String,
  enabled: Schema.Boolean,
  // What the month so far costs, excluding tax, from the server's own
  // counts and the rate card (the connected accounts and the meters);
  // null on a server that does not bill. The invoice is the one that
  // counts.
  estimate: Schema.NullOr(MoneySchema),
  // The billing account's meters this month, on a server that bills;
  // null elsewhere, where nothing is metered.
  meters: Schema.NullOr(Schema.Array(BillingMeterSchema)),
  // Whether the last payment of the billing account's per-account
  // subscription failed: past due while Stripe retries (it still
  // entitles), or unpaid once Stripe gave up (it no longer entitles, yet
  // Stripe may still bill it, so nothing is ordered). Its payment method is
  // updated in the customer portal. Told to the workspace that bills the
  // account only (false elsewhere); older servers leave it out.
  paymentFailed: Schema.optionalKey(Schema.Boolean),
  // Whether the billing account pays with a payment method: its
  // per-account subscription is active or past due.
  paymentMethod: Schema.Boolean,
  plan: Schema.NullOr(PlanSchema),
  // The plans a workspace can be on, from the smallest: `free` and
  // `payAsYouGo`, which the rate card prices (`price` null for both), with
  // what each allows the billing account.
  plans: Schema.Array(PlanOfferSchema),
  // Per-account pricing's rates, as `peal-contract/rate-card` holds them;
  // null on a server that does not bill.
  rateCard: Schema.NullOr(RateCardSchema),
  subscription: Schema.NullOr(BillingSubscriptionSchema),
  trial: Schema.NullOr(TrialOfferSchema),
  // What the payment provider's next invoice of the subscription takes,
  // tax included, when it can say; null without one.
  upcomingInvoice: Schema.NullOr(MoneySchema),
  usage: UsageSchema,
  // The VAT rate, in percent, prices are shown with first.
  vatRate: Schema.Int,
  // Until when a consumer may withdraw from the subscription.
  withdrawableUntil: Schema.NullOr(Schema.DateTimeUtc),
}).annotate({ identifier: "Billing" });

export type Billing = typeof BillingSchema.Type;

/** The limits a workspace holds things against, which a plan can shrink under. */
export const HeldLimitSchema = Schema.Literals([
  "channels",
  "members",
  "mediaStorage",
]).annotate({ identifier: "HeldLimit" });

export type HeldLimit = typeof HeldLimitSchema.Type;

/** A workspace holds `used` of something its plan allows `allowed` of. */
export const ExcessSchema = Schema.Struct({
  allowed: Int64Schema,
  limit: HeldLimitSchema,
  used: Int64Schema,
}).annotate({ identifier: "Excess" });

export type Excess = typeof ExcessSchema.Type;

/**
 * Where a workspace stands against its plan. A plan that shrinks under a
 * workspace (its trial ends, its subscription is cancelled or left unpaid)
 * deletes nothing, so the workspace can hold more than the plan allows.
 */
export const StandingSchema = Schema.Struct({
  // The billing account the workspace is on, whose workspaces count their
  // channels together, on a server that bills; left out on one that does
  // not, and by older servers.
  account: Schema.optionalKey(BillingAccountSchema),
  // Until when a workspace on the free tier that holds more accounts than
  // it allows still schedules and publishes, as when billing was turned on
  // after it connected them: it connects no more meanwhile, and must
  // reduce or add a payment method by then; only the accounts it had
  // connected before the grace started are graced. Null when no grace
  // applies; older servers leave it out.
  graceUntil: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtc)),
  // Whether the workspace must come back within its plan before anything
  // else: it holds more channels or members than the plan allows, and
  // schedules and publishes nothing until it does. Media over the plan
  // only refuses uploads.
  mustReduce: Schema.Boolean,
  // What it holds beyond its plan; empty on a server that does not bill.
  over: Schema.Array(ExcessSchema),
  // Null on a server that does not bill.
  plan: Schema.NullOr(PlanSchema),
  // The plan that holds everything it has, when it is over its own:
  // `payAsYouGo`, with a payment method; null within it, or when no plan
  // holds that much.
  planWithRoom: Schema.NullOr(PaidPlanSchema),
  // The posts scheduled to go out this month (UTC). While `mustReduce`,
  // each fails when due, with `planLimit` as its reason, and can be posted
  // again once the workspace is within its plan.
  scheduledPosts: Schema.Int,
}).annotate({ identifier: "Standing" });

export type Standing = typeof StandingSchema.Type;

/** Whom a workspace's payer offers it to. */
export const TransferPayloadSchema = Schema.Struct({
  // Another owner of the workspace, by user id.
  toUserId: Schema.String,
}).annotate({ identifier: "TransferPayload" });

export type TransferPayload = typeof TransferPayloadSchema.Type;

/** What stays in a workspace that must come back within its plan. */
export const ReductionPayloadSchema = Schema.Struct({
  // The channels that stay connected, by id: every other is disconnected.
  // Read only while the workspace is over its plan's channels.
  keepChannelIds: Schema.Array(Schema.String),
  // The members who stay, by user id, whoever chooses among them: every
  // other is removed, and the pending invitations are revoked. Read only
  // while the workspace is over its plan's members.
  keepMemberIds: Schema.Array(Schema.String),
}).annotate({ identifier: "ReductionPayload" });

export type ReductionPayload = typeof ReductionPayloadSchema.Type;

/** What choosing what stays did, and where the workspace then stands. */
export const ReductionSchema = Schema.Struct({
  disconnectedChannels: Schema.Int,
  removedMembers: Schema.Int,
  revokedInvitations: Schema.Int,
  standing: StandingSchema,
}).annotate({ identifier: "Reduction" });

export type Reduction = typeof ReductionSchema.Type;

/**
 * What a member orders before Stripe's checkout: a plan and how often it is
 * paid for, or the trial; and that they ask for it to start now, knowing
 * that as a consumer they may withdraw within 14 days and then pay only for
 * the days used (the box on the billing page, which must be ticked).
 */
export const OrderPayloadSchema = Schema.Struct({
  // The version of the box's words the client showed (`orderConsentVersion`
  // in `peal-contract/billing-plans`); a per-account order without it,
  // or with another than the server's, is refused (ConsentChanged). Kept
  // optional for the legacy plans, which answer PlanNotSold as before.
  consentVersion: Schema.optionalKey(Schema.String),
  interval: BillingIntervalSchema,
  plan: OrderablePlanSchema,
  startNow: Schema.Literal(true),
  trial: Schema.Boolean,
}).annotate({ identifier: "OrderPayload" });

export type OrderPayload = typeof OrderPayloadSchema.Type;

/** An order, which the checkout that follows names. */
export const OrderSchema = Schema.Struct({
  createdAt: Schema.DateTimeUtc,
  id: Schema.String,
  interval: BillingIntervalSchema,
  plan: PaidPlanSchema,
  trial: Schema.Boolean,
}).annotate({ identifier: "Order" });

export type Order = typeof OrderSchema.Type;

/** What cancelling did. */
/** What a member says when cancelling, signed in. */
export const CancelPayloadSchema = Schema.Struct({
  // The day the contract should end (UTC, as `2026-12-31`), if later than
  // the period paid for; null or absent is as soon as the contract allows.
  desiredOn: Schema.optionalKey(
    Schema.NullOr(
      Schema.String.check(
        Schema.isPattern(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u, {
          description: "a day, as YYYY-MM-DD",
        })
      )
    )
  ),
}).annotate({ identifier: "CancelPayload" });

export type CancelPayload = typeof CancelPayloadSchema.Type;

export const CancellationSchema = Schema.Struct({
  // When the subscription ends: its period's end, the later day asked
  // for, or now for a trial.
  endsAt: Schema.DateTimeUtc,
  plan: PaidPlanSchema,
}).annotate({ identifier: "Cancellation" });

export type Cancellation = typeof CancellationSchema.Type;

/** What withdrawing would do now. */
export const WithdrawalPreviewSchema = Schema.Struct({
  // Until when the member may withdraw.
  endsAt: Schema.DateTimeUtc,
  plan: PaidPlanSchema,
  // What would be paid back now, excluding nothing: the part of the
  // payment for the rest of the period.
  refund: MoneySchema,
  startedAt: Schema.DateTimeUtc,
}).annotate({ identifier: "WithdrawalPreview" });

export type WithdrawalPreview = typeof WithdrawalPreviewSchema.Type;

/** What withdrawing did. */
export const WithdrawalSchema = Schema.Struct({
  plan: PaidPlanSchema,
  refunded: MoneySchema,
  withdrawnAt: Schema.DateTimeUtc,
}).annotate({ identifier: "Withdrawal" });

export type Withdrawal = typeof WithdrawalSchema.Type;

/**
 * A workspace's plan and what it uses of it. Checkout and the customer
 * portal are Better Auth's Stripe routes (`/api/auth/subscription/upgrade`
 * and `/api/auth/subscription/billing-portal`, with the workspace as
 * `referenceId` and `customerType: "organization"`), for members with
 * billing:manage; a checkout needs an order (`BillingActionsApi`).
 */
export class BillingApi extends HttpApiGroup.make("billing")
  .add(
    HttpApiEndpoint.get("get", "/", {
      error: Forbidden,
      params: { workspaceId: Schema.String },
      success: BillingSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with the workspace's plan (`free`, `payAsYouGo`, or a plan priced by tiers of channels a subscription still holds), the subscription that buys it, what each limit allows its billing account, how much of it the workspace uses, and the plans it can be on. On a server that does not bill, nothing is limited. Needs billing:read.",
        summary: "Get the workspace's billing",
      })
    )
  )
  .add(
    HttpApiEndpoint.get("standing", "/standing", {
      params: { workspaceId: Schema.String },
      success: StandingSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers where the workspace stands against its plan: what it holds beyond it, as on the free tier with more than 2 connected accounts across its billing account after a subscription ended, whether it must come back within it before anything else (more channels or members than the plan allows: nothing is scheduled or published until then, and posts already scheduled fail when due with `planLimit`), until when a grace keeps it publishing (`graceUntil`), the plan that holds everything (`payAsYouGo`, with a payment method), and how many posts wait. Those who manage billing add a payment method, or choose what stays, in the web app. For every member of the workspace.",
        summary: "Get the workspace's standing",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/billing") {}
