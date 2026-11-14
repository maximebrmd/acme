import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace tried to connect websites too many times for now. */
export class SiteConnectLimited extends Schema.TaggedError<SiteConnectLimited>()(
  "SiteConnectLimited",
  { ...errorEnvelope },
  {
    description:
      "The workspace tried to connect websites too many times in the last hour. Try again later.",
    httpApiStatus: 429,
  }
) {}
