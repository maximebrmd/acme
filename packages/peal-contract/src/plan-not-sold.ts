import { Schema } from "effect";

import { BillingIntervalSchema, PaidPlanSchema } from "./billing-plans.ts";
import { errorEnvelope } from "./error-envelope.ts";

/**
 * An order for a plan or an interval no longer sold: only `payAsYouGo`,
 * monthly, is. The plans priced by tiers of connected channels and yearly
 * billing are kept for the subscriptions that hold them.
 */
export class PlanNotSold extends Schema.TaggedError<PlanNotSold>()(
  "PlanNotSold",
  {
    ...errorEnvelope,
    // What the order asked for.
    interval: BillingIntervalSchema,
    plan: PaidPlanSchema,
  },
  {
    description:
      "The plan or the interval ordered is no longer sold: order `payAsYouGo`, monthly, which prices each connected account and each use. A subscription to an older plan keeps working until it ends. Nothing was ordered.",
    httpApiStatus: 409,
  }
) {}
