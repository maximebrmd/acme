import { Schema } from "effect";

import { PlanLimitSchema } from "./billing-plans.ts";

/**
 * The workspace's plan allows no more of this. Only a server that bills
 * answers it.
 */
export class PlanLimitReached extends Schema.TaggedError<PlanLimitReached>()(
  "PlanLimitReached",
  {
    // How many the plan allows, which the workspace already has.
    allowed: Schema.Int,
    limit: PlanLimitSchema,
  },
  {
    description:
      "The workspace's plan allows no more of `limit`: it has `allowed` already. A larger plan, or removing some, makes room. Nothing was changed.",
    httpApiStatus: 402,
  }
) {}
