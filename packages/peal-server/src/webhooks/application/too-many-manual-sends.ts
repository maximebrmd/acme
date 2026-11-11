import { Schema } from "effect";

/**
 * The workspace's members sent as many test events and deliveries again
 * as it may in an hour: nothing was sent. `retryAfterSeconds` is how long
 * until the hour ends.
 */
export class TooManyManualSends extends Schema.TaggedError<TooManyManualSends>()(
  "TooManyManualSends",
  { allowed: Schema.Int, retryAfterSeconds: Schema.Int }
) {}
