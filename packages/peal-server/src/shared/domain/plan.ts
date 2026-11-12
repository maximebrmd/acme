import { Schema } from "effect";

/**
 * The plans priced by tiers of connected channels, from the smallest, which
 * a Stripe subscription bought before per-account pricing: their
 * allowances and prices are the billing context's
 * (`billing/domain/plans.ts`, `prices.ts`). Legacy: they are kept for the
 * subscriptions that still hold one.
 */
export const LegacyPaidPlanSchema = Schema.Literals([
  "starter",
  "pro",
  "business",
  "agency",
]);

export type LegacyPaidPlan = typeof LegacyPaidPlanSchema.Type;

/**
 * The plans a workspace pays for, on a server that bills, from the
 * smallest: the legacy plans, then `payAsYouGo`, per-account pricing on
 * the rate card (`billing/domain/rate-card.ts`).
 */
export const PaidPlanSchema = Schema.Literals([
  ...LegacyPaidPlanSchema.literals,
  "payAsYouGo",
]);

export type PaidPlan = typeof PaidPlanSchema.Type;

/** `free`, which a workspace is on without a subscription, and the legacy plans. */
export const LegacyPlanSchema = Schema.Literals([
  "free",
  ...LegacyPaidPlanSchema.literals,
]);

export type LegacyPlan = typeof LegacyPlanSchema.Type;

/**
 * Every plan, from the smallest: `free`, which a workspace is on without a
 * subscription, and the paid ones.
 */
export const PlanSchema = Schema.Literals([
  ...LegacyPlanSchema.literals,
  "payAsYouGo",
]);

export type Plan = typeof PlanSchema.Type;
