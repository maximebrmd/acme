import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** A subscription a deletion would cancel. */
export const SubscriptionToCancelSchema = Schema.Struct({
  // When the period paid for ends, null when billing does not know yet.
  paidUntil: Schema.NullOr(Schema.DateTimeUtc),
  // The plan it buys, null when billing does not know yet.
  plan: Schema.NullOr(Schema.String),
  // The workspace it bills.
  workspaceId: Schema.String,
});

export type SubscriptionToCancel = typeof SubscriptionToCancelSchema.Type;

/**
 * A workspace the deletion would erase has a subscription Stripe may still
 * bill, and the deletion did not say to cancel it: nothing was deleted.
 * Show the person every subscription listed, then send the deletion again
 * with `cancelSubscriptions: true` once they agreed.
 */
export class WorkspaceSubscribed extends Schema.TaggedError<WorkspaceSubscribed>()(
  "WorkspaceSubscribed",
  {
    ...errorEnvelope,
    // Every subscription the deletion would cancel, in each workspace it
    // would erase.
    subscriptions: Schema.Array(SubscriptionToCancelSchema),
  },
  {
    description:
      "A workspace the deletion would erase has a subscription Stripe may still bill, unpaid or paused ones included, and the request did not say to cancel it: nothing was deleted. `subscriptions` lists each one, with its workspace, its plan and when the period paid for ends. Tell the person, then send the deletion again with `cancelSubscriptions: true`: each subscription is cancelled at once and nothing more is charged. The period already paid for is not refunded, except where the law gives a refund, as to a consumer who withdraws within 14 days of subscribing.",
    httpApiStatus: 409,
  }
) {}
