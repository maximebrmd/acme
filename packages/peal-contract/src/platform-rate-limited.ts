import { Schema } from "effect";

/**
 * The platform asked to slow down, or an allowance of the day is spent.
 * `retryAfterSeconds` is how long it asked to wait, when it said.
 */
export class PlatformRateLimited extends Schema.TaggedError<PlatformRateLimited>()(
  "PlatformRateLimited",
  { retryAfterSeconds: Schema.NullOr(Schema.Int) },
  {
    description:
      "The platform asked to slow down, or an allowance of the day is spent. `retryAfterSeconds` is how long it asked to wait, when it said.",
    httpApiStatus: 429,
  }
) {}
