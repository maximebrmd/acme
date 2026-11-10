import { Schema } from "effect";

/**
 * The workspace's members sent as many test events and deliveries again
 * as it may in an hour: nothing was sent.
 */
export class TooManyManualSends extends Schema.TaggedError<TooManyManualSends>()(
  "TooManyManualSends",
  { allowed: Schema.Int }
) {}
