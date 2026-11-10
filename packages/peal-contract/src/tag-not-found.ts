import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no tag with this id. */
export class TagNotFound extends Schema.TaggedError<TagNotFound>()(
  "TagNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no tag with this id.",
    httpApiStatus: 404,
  }
) {}
