import { Schema } from "effect";

/**
 * A deletion failed after its subscriptions were cancelled at Stripe,
 * which cannot be undone: nothing was deleted, the workspaces are on the
 * free plan once Stripe's events come, and deleting them again cancels
 * nothing more.
 */
export class ErasureIncomplete extends Schema.TaggedError<ErasureIncomplete>()(
  "ErasureIncomplete",
  {
    // What stopped the deletion, by its name: for the logs.
    reason: Schema.String,
    subscriptionsCancelled: Schema.Int,
  }
) {}
