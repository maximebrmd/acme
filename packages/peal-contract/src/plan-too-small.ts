import { Schema } from "effect";

import { PaidPlanSchema } from "./billing-plans.ts";
import { ExcessSchema } from "./billing.ts";
import { errorEnvelope } from "./error-envelope.ts";

/**
 * The plan ordered does not hold what the workspace has: an order never
 * puts a workspace above its plan.
 */
export class PlanTooSmall extends Schema.TaggedError<PlanTooSmall>()(
  "PlanTooSmall",
  {
    ...errorEnvelope,
    // What the workspace holds beyond the plan ordered: what to remove
    // first.
    over: Schema.Array(ExcessSchema),
    plan: PaidPlanSchema,
    // The smallest plan that holds everything; null past the largest.
    planWithRoom: Schema.NullOr(PaidPlanSchema),
  },
  {
    description:
      "The plan ordered is too small for what the workspace holds: `over` lists each thing with what `plan` allows, to remove first (disconnect channels, remove members, delete media), and `planWithRoom` is the smallest plan that holds everything. Nothing was ordered.",
    httpApiStatus: 409,
  }
) {}
