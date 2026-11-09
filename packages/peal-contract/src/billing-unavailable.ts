import { Schema } from "effect";

/**
 * Stripe could not be reached, to expire the workspace's open checkouts
 * before deleting it, or to change its subscription: nothing was deleted or
 * changed.
 */
export class BillingUnavailable extends Schema.TaggedError<BillingUnavailable>()(
  "BillingUnavailable",
  {
    // The workspace whose billing Stripe was asked about.
    workspaceId: Schema.String,
  },
  {
    description:
      "Stripe could not be reached about the workspace's billing, so nothing was deleted or changed. Try again later.",
    httpApiStatus: 503,
  }
) {}
