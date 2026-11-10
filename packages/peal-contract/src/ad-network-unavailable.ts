import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The ad network did not answer, asked to slow down, or could not confirm a change: nothing is known to have changed, the boost stands where it did, and trying again later is safe. */
export class AdNetworkUnavailable extends Schema.TaggedError<AdNetworkUnavailable>()(
  "AdNetworkUnavailable",
  {
    ...errorEnvelope,
    retryAfterSeconds: Schema.NullOr(Schema.Int),
  },
  {
    description:
      "The ad network did not answer, asked to slow down, or could not confirm a change: nothing is known to have changed, the boost stands where it did, and trying again later is safe. `retryAfterSeconds` is how long the network asked to wait, when it said.",
    httpApiStatus: 503,
  }
) {}
