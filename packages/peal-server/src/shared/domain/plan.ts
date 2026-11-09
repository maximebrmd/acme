import { Schema } from "effect";

/**
 * The plans a workspace pays for, on a server that bills: a Stripe
 * subscription buys one. Their allowances are the billing context's
 * (`billing/domain/plans.ts`).
 */
export const PaidPlanSchema = Schema.Literals(["pro", "business"]);

export type PaidPlan = typeof PaidPlanSchema.Type;

/** Every plan: `free`, which a workspace is on without a subscription, and the paid ones. */
export const PlanSchema = Schema.Literals(["free", "pro", "business"]);

export type Plan = typeof PlanSchema.Type;
