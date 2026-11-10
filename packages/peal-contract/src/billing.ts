import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import {
  BillingIntervalSchema,
  MoneySchema,
  PaidPlanSchema,
  PlanSchema,
} from "./billing-plans.ts";
import { Forbidden } from "./forbidden.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

// Null for no limit.
const allowance = Schema.NullOr(Schema.Int);

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
  mediaStorage: Schema.Int,
  members: Schema.Int,
  // Going out this month (UTC).
  scheduledPosts: PeriodUsageSchema,
}).annotate({ identifier: "Usage" });

export type Usage = typeof UsageSchema.Type;

/** The trial a workspace may start once, without a payment method. */
export const TrialOfferSchema = Schema.Struct({
  // Whether the member asking may start it for this workspace now.
  available: Schema.Boolean,
  days: Schema.Int,
  plan: PaidPlanSchema,
}).annotate({ identifier: "TrialOffer" });

export type TrialOffer = typeof TrialOfferSchema.Type;

/**
 * A workspace's billing. On a server that does not bill, `enabled` is false,
 * `plan`, `subscription`, `trial` and `withdrawableUntil` are null, every
 * allowance is null and `plans` is empty: nothing is limited.
 */
export const BillingSchema = Schema.Struct({
  allowances: PlanAllowancesSchema,
  // The currency of every price.
  currency: Schema.String,
  enabled: Schema.Boolean,
  plan: Schema.NullOr(PlanSchema),
  // Every plan, from the smallest, to compare and move to.
  plans: Schema.Array(PlanOfferSchema),
  subscription: Schema.NullOr(BillingSubscriptionSchema),
  trial: Schema.NullOr(TrialOfferSchema),
  usage: UsageSchema,
  // The VAT rate, in percent, prices are shown with first.
  vatRate: Schema.Int,
  // Until when a consumer may withdraw from the subscription.
  withdrawableUntil: Schema.NullOr(Schema.DateTimeUtc),
}).annotate({ identifier: "Billing" });

export type Billing = typeof BillingSchema.Type;

/**
 * What a member orders before Stripe's checkout: a plan and how often it is
 * paid for, or the trial; and that they ask for it to start now, knowing
 * that as a consumer they may withdraw within 14 days and then pay only for
 * the days used (the box on the billing page, which must be ticked).
 */
export const OrderPayloadSchema = Schema.Struct({
  interval: BillingIntervalSchema,
  plan: PaidPlanSchema,
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
          "Answers with the workspace's plan, the subscription that buys it, what each limit allows, how much of it the workspace uses, and every plan to compare. On a server that does not bill, nothing is limited. Needs billing:read.",
        summary: "Get the workspace's billing",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/billing") {}
