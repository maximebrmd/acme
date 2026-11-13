import { Schema } from "effect";

import { SubscriptionStatusSchema } from "./billing.ts";
import { errorEnvelope } from "./error-envelope.ts";

/**
 * The billing account already holds per-account pricing: nothing more is
 * ordered. One past due or unpaid is settled by updating the payment
 * method in the customer portal.
 */
export class AlreadySubscribed extends Schema.TaggedError<AlreadySubscribed>()(
  "AlreadySubscribed",
  {
    ...errorEnvelope,
    // Where the subscription it holds stands, as Stripe names it.
    status: SubscriptionStatusSchema,
  },
  {
    description:
      "The billing account already holds `payAsYouGo`, in `status`: a second subscription is never opened. One past due or unpaid is settled by updating the payment method in the customer portal, from the billing page. Nothing was ordered.",
    httpApiStatus: 409,
  }
) {}
