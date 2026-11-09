import { Schema } from "effect";

/**
 * The workspace has a subscription Stripe may still bill, and cannot be
 * deleted until it is cancelled.
 */
export class WorkspaceSubscribed extends Schema.TaggedError<WorkspaceSubscribed>()(
  "WorkspaceSubscribed",
  {
    // The workspace a subscription may still bill.
    workspaceId: Schema.String,
  },
  {
    description:
      "The workspace has a subscription Stripe may still bill, unpaid or paused ones included. Cancel it from the billing page first; the workspace can be deleted once the subscription has ended.",
    httpApiStatus: 409,
  }
) {}
