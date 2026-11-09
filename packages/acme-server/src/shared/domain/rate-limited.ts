import { Schema } from "effect";

/**
 * The platform, or Acme's own limiter for the account, refused the request
 * before accepting it. `retryAfter` is how long the platform asked to wait,
 * when it said.
 */
export class RateLimited extends Schema.TaggedError<RateLimited>()(
  "RateLimited",
  { retryAfter: Schema.optionalKey(Schema.DurationFromMillis) }
) {}
