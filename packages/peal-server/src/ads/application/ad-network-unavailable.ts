import { Schema } from "effect";

/** The ad network did not answer, or refused for now: nothing was changed, and trying again later is safe. */
export class AdNetworkUnavailable extends Schema.TaggedError<AdNetworkUnavailable>()(
  "AdNetworkUnavailable",
  { retryAfter: Schema.optionalKey(Schema.DurationFromMillis) }
) {}
