import { Schema } from "effect";

/** This server has no settings for the Meta app the request names. */
export class MetaAppNotConfigured extends Schema.TaggedError<MetaAppNotConfigured>()(
  "MetaAppNotConfigured",
  {},
  {
    description:
      "This server has no settings for this Meta app, so it signed nobody in with it.",
    httpApiStatus: 404,
  }
) {}
