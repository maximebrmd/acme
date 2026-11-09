import { Schema } from "effect";

/**
 * The workspace has a subscription Stripe may still bill, and the deletion
 * did not say to cancel it: nothing was deleted. Send the deletion again
 * with `cancelSubscriptions: true` once the person agreed.
 */
export class WorkspaceSubscribed extends Schema.TaggedError<WorkspaceSubscribed>()(
  "WorkspaceSubscribed",
  {
    // When the period paid for ends, null when billing does not know yet.
    paidUntil: Schema.NullOr(Schema.DateTimeUtc),
    // The plan it buys, null when billing does not know yet.
    plan: Schema.NullOr(Schema.String),
    // The workspace a subscription may still bill.
    workspaceId: Schema.String,
  },
  {
    description:
      "The workspace has a subscription Stripe may still bill, unpaid or paused ones included, and the request did not say to cancel it: nothing was deleted. `plan` and `paidUntil` say what cancelling ends. Tell the person, then send the deletion again with `cancelSubscriptions: true`: the subscription is cancelled at once, the period already paid for is not refunded, and nothing more is charged.",
    httpApiStatus: 409,
  }
) {}
