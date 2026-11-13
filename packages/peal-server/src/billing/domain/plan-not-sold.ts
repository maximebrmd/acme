import { Schema } from "effect";

import { PaidPlanSchema } from "#shared/domain/plan.ts";

import { BillingIntervalSchema } from "./billing-interval.ts";

/**
 * An order for a plan or an interval no longer sold: only per-account
 * pricing (`payAsYouGo`), monthly, is. The legacy plans and yearly
 * billing are kept for the subscriptions that hold them.
 */
export class PlanNotSold extends Schema.TaggedError<PlanNotSold>()(
  "PlanNotSold",
  { interval: BillingIntervalSchema, plan: PaidPlanSchema }
) {
  override get message(): string {
    return `The ${this.plan} plan is not sold ${this.interval === "year" ? "yearly" : "monthly"}`;
  }
}
