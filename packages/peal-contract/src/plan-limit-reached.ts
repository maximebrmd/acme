import { Schema } from "effect";

import {
  PaidPlanSchema,
  PlanLimitSchema,
  PlanSchema,
} from "./billing-plans.ts";
import { errorEnvelope } from "./error-envelope.ts";
import { Int64Schema } from "./int64.ts";

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
    // A count of bytes for `mediaStorage`: 64-bit.
    allowed: Int64Schema,
    // The workspace's billing page in the web app, where an owner or an
    // admin orders a plan.
    billingUrl: Schema.String,
    limit: PlanLimitSchema,
    // The plan the workspace is on.
    plan: PlanSchema,
    // The plan with room for what was refused: `payAsYouGo` when a payment
    // method gives room; null when no plan holds that much.
    planWithRoom: Schema.NullOr(PaidPlanSchema),
    // How many the workspace holds now, counted as the limit counts them:
    // more than `allowed` after a move to a smaller plan.
    used: Int64Schema,
  },
  {
    description:
      "The workspace's plan (`plan`) allows `allowed` of `limit`, across every workspace of its billing account, and holds `used`: nothing was changed. `planWithRoom` is `payAsYouGo` when a payment method gives room (as for a third connected account on the free tier), which an owner or an admin adds by ordering on the billing page (`billingUrl`); it is null when no plan holds that much. Removing some makes room too. A workspace holding more than its plan allows, as after a subscription ended, adds nothing until it is back within it.",
    httpApiStatus: 402,
  }
) {}
