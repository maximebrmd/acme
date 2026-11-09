import { Schema } from "effect";

/**
 * Stripe could not be reached to expire the workspace's open checkouts, so
 * nothing was deleted.
 */
export class BillingUnavailable extends Schema.TaggedError<BillingUnavailable>()(
  "BillingUnavailable",
  {
    // The workspace whose checkouts could not be expired.
    workspaceId: Schema.String,
  },
  {
    description:
      "Stripe could not be reached to expire the workspace's open checkouts, so nothing was deleted. Try again later.",
    httpApiStatus: 503,
  }
) {}
