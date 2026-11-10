import { Schema } from "effect";

import { PaidPlanSchema, PlanSchema } from "./billing-plans.ts";
import { errorEnvelope } from "./error-envelope.ts";

/** The workspace sent the assistant every request it may send today. */
export class AssistantQuotaExceeded extends Schema.TaggedError<AssistantQuotaExceeded>()(
  "AssistantQuotaExceeded",
  {
    ...errorEnvelope,
    // The workspace's billing page in the web app; null on a server that
    // does not bill, where the operator sets the allowance.
    billingUrl: Schema.NullOr(Schema.String),
    dailyLimit: Schema.Int,
    // The plan the workspace is on; null on a server that does not bill.
    plan: Schema.NullOr(PlanSchema),
    // The smallest larger plan that allows more requests a day; null on
    // the largest plan and on a server that does not bill.
    planWithRoom: Schema.NullOr(PaidPlanSchema),
    // Midnight UTC, when the workspace's requests count from zero again.
    resetsAt: Schema.DateTimeUtc,
  },
  {
    description:
      "The workspace used every assistant request it has today. Try again after `resetsAt`, or, on a server that bills, move to `planWithRoom`, which allows more, on the billing page (`billingUrl`).",
    httpApiStatus: 429,
  }
) {}
