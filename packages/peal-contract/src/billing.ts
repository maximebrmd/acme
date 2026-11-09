import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { PaidPlanSchema, PlanSchema } from "./billing-plans.ts";
import { Forbidden } from "./forbidden.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

// Null for no limit.
const allowance = Schema.NullOr(Schema.Int);

/** What a plan allows a workspace, limit by limit; null for no limit. */
export const PlanAllowancesSchema = Schema.Struct({
  assistantRequests: allowance,
  channels: allowance,
  members: allowance,
  scheduledPosts: allowance,
}).annotate({ identifier: "PlanAllowances" });

export type PlanAllowances = typeof PlanAllowancesSchema.Type;

/** A plan, and what it allows. */
export const PlanOfferSchema = Schema.Struct({
  allowances: PlanAllowancesSchema,
  plan: PlanSchema,
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
  plan: PaidPlanSchema,
  status: SubscriptionStatusSchema,
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
  members: Schema.Int,
  // Going out this month (UTC).
  scheduledPosts: PeriodUsageSchema,
}).annotate({ identifier: "Usage" });

export type Usage = typeof UsageSchema.Type;

/**
 * A workspace's billing. On a server that does not bill, `enabled` is false,
 * `plan` and `subscription` are null, every allowance is null and `plans` is
 * empty: nothing is limited.
 */
export const BillingSchema = Schema.Struct({
  allowances: PlanAllowancesSchema,
  enabled: Schema.Boolean,
  plan: Schema.NullOr(PlanSchema),
  // Every plan, from the smallest, to compare and move to.
  plans: Schema.Array(PlanOfferSchema),
  subscription: Schema.NullOr(BillingSubscriptionSchema),
  usage: UsageSchema,
}).annotate({ identifier: "Billing" });

export type Billing = typeof BillingSchema.Type;

/**
 * A workspace's plan and what it uses of it. Checkout and the customer
 * portal are Better Auth's Stripe routes (`/api/auth/subscription/upgrade`
 * and `/api/auth/subscription/billing-portal`, with the workspace as
 * `referenceId` and `customerType: "organization"`), for members with
 * billing:manage.
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
