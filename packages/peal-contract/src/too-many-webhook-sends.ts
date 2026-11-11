import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The workspace's members sent as many test events and deliveries again
 * as it may in an hour.
 */
export class TooManyWebhookSends extends Schema.TaggedError<TooManyWebhookSends>()(
  "TooManyWebhookSends",
  {
    ...errorEnvelope,
    // How many a workspace may send by hand in an hour, of the kind asked
    // for: test events and single deliveries sent again, or deliveries sent
    // again by the many.
    allowed: Schema.Int,
    // Seconds until the hour ends, as the `Retry-After` header says.
    retryAfterSeconds: Schema.Int,
  },
  {
    description:
      "The workspace's members sent `allowed` test events and deliveries again within an hour, the most it may, or the call would send more than are left (a call to send many again is taken whole or not at all): nothing was sent. Try again in `retryAfterSeconds` seconds.",
    httpApiStatus: 429,
  }
) {}
