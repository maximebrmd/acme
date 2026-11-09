import { Schema } from "effect";

/**
 * The platform, or Acme's own limiter for the account, refused the request
 * before accepting it. `retryAfter` is how long the platform asked to wait,
 * when it said. `code` names a daily allowance spent until it resets, as
 * `#publishing/domain/own-refusals.ts` lists them; never content.
 */
export class RateLimited extends Schema.TaggedError<RateLimited>()(
  "RateLimited",
  {
    code: Schema.optionalKey(Schema.String),
    retryAfter: Schema.optionalKey(Schema.DurationFromMillis),
  }
) {}
