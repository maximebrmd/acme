import { Schema } from "effect";

import { SubscriptionStatusSchema } from "./subscription.ts";

/**
 * The billing account already holds per-account pricing, in `status`:
 * nothing more is ordered. One past due or unpaid is settled by updating
 * the payment method in the customer portal, not by a second contract.
 */
export class AlreadySubscribed extends Schema.TaggedError<AlreadySubscribed>()(
  "AlreadySubscribed",
  { status: SubscriptionStatusSchema }
) {}
