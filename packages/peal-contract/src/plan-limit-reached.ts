import { Schema } from "effect";

import {
  PaidPlanSchema,
  PlanLimitSchema,
  PlanSchema,
} from "./billing-plans.ts";
import { errorEnvelope } from "./error-envelope.ts";

/**
 * The workspace's plan allows no more of this, with what a client needs to
 * offer the way out: the plan, what it holds, the smallest plan with room
 * and where to order it. Only a server that bills answers it.
 */
export class PlanLimitReached extends Schema.TaggedError<PlanLimitReached>()(
  "PlanLimitReached",
  {
    ...errorEnvelope,
    // How many the plan allows.
    allowed: Schema.Int,
    // The workspace's billing page in the web app, where an owner or an
    // admin orders a plan.
    billingUrl: Schema.String,
    limit: PlanLimitSchema,
    // The plan the workspace is on.
    plan: PlanSchema,
    // The smallest larger plan with room for what was refused; null on the
    // largest plan, or when no plan holds that much.
    planWithRoom: Schema.NullOr(PaidPlanSchema),
    // How many the workspace holds now, counted as the limit counts them:
    // more than `allowed` after a move to a smaller plan.
    used: Schema.Int,
  },
  {
    description:
      "The workspace's plan (`plan`) allows `allowed` of `limit`, and the workspace holds `used`: nothing was changed. `planWithRoom` is the smallest plan with room for what was refused, which an owner or an admin orders on the billing page (`billingUrl`); it is null on the largest plan, where more is asked for by writing to Peal. Removing some makes room too. A workspace holding more than its plan allows, as after a trial, adds nothing until it is back within it.",
    httpApiStatus: 402,
  }
) {}
