import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** Ads are off on this server, or the ad network asked for is not set up on it: its operator turns them on. */
export class AdsUnavailable extends Schema.TaggedError<AdsUnavailable>()(
  "AdsUnavailable",
  { ...errorEnvelope },
  {
    description:
      "Ads are off on this server, or the ad network asked for is not set up on it: its operator turns them on.",
    httpApiStatus: 404,
  }
) {}
