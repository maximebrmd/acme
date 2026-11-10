import { Schema } from "effect";

import { PaidPlanSchema } from "#shared/domain/plan.ts";

import { ExcessSchema } from "./standing.ts";

/**
 * The plan ordered does not hold what the workspace has: `over` lists what
 * to remove first, or a larger plan holds it. A workspace is never put
 * above its plan by an order.
 */
export class PlanTooSmall extends Schema.TaggedError<PlanTooSmall>()(
  "PlanTooSmall",
  {
    over: Schema.Array(ExcessSchema),
    plan: PaidPlanSchema,
    // The smallest plan that holds everything; none past the largest.
    planWithRoom: Schema.Option(PaidPlanSchema),
  }
) {}
