import { Schema } from "effect";

/**
 * The plans a workspace pays for, on a server that bills, from the
 * smallest: a Stripe subscription buys one. Their allowances and prices
 * are the billing context's (`billing/domain/plans.ts`, `prices.ts`).
 */
export const PaidPlanSchema = Schema.Literals([
  "starter",
  "pro",
  "business",
  "agency",
]);

export type PaidPlan = typeof PaidPlanSchema.Type;

/**
 * Every plan, from the smallest: `free`, which a workspace is on without a
 * subscription, and the paid ones.
 */
export const PlanSchema = Schema.Literals([
  "free",
  "starter",
  "pro",
  "business",
  "agency",
]);

export type Plan = typeof PlanSchema.Type;
