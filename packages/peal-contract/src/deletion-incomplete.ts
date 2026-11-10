import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The deletion cancelled subscriptions at Stripe, then failed: nothing was
 * deleted, and the cancellations stand.
 */
export class DeletionIncomplete extends Schema.TaggedError<DeletionIncomplete>()(
  "DeletionIncomplete",
  {
    ...errorEnvelope,
    // How many subscriptions were cancelled at Stripe before it failed.
    subscriptionsCancelled: Schema.Int,
  },
  {
    description:
      "The deletion cancelled `subscriptionsCancelled` subscriptions at Stripe, at once and for good, then failed: nothing was deleted. The workspaces stay, on the free plan once Stripe confirms, with everything in them. Tell the person their subscriptions were cancelled, then send the deletion again: it cancels nothing more.",
    httpApiStatus: 500,
  }
) {}
