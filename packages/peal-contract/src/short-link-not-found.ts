import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no short link with this id. */
export class ShortLinkNotFound extends Schema.TaggedError<ShortLinkNotFound>()(
  "ShortLinkNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no short link with this id.",
    httpApiStatus: 404,
  }
) {}
