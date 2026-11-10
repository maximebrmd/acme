import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** This server has no settings for the Meta app the request names. */
export class MetaAppNotConfigured extends Schema.TaggedError<MetaAppNotConfigured>()(
  "MetaAppNotConfigured",
  { ...errorEnvelope },
  {
    description:
      "This server has no settings for this Meta app, so it signed nobody in with it.",
    httpApiStatus: 404,
  }
) {}
