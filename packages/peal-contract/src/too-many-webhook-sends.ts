import { Schema } from "effect";

/**
 * The workspace's members sent as many test events and deliveries again
 * as it may in an hour.
 */
export class TooManyWebhookSends extends Schema.TaggedError<TooManyWebhookSends>()(
  "TooManyWebhookSends",
  {
    // How many a workspace may send by hand in an hour.
    allowed: Schema.Int,
  },
  {
    description:
      "The workspace's members sent `allowed` test events and deliveries again within an hour, the most it may: nothing was sent. Try again later.",
    httpApiStatus: 429,
  }
) {}
