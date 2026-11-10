import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no post with this id. */
export class PostNotFound extends Schema.TaggedError<PostNotFound>()(
  "PostNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no post with this id.",
    httpApiStatus: 404,
  }
) {}
