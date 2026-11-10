import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The post has no such comment. */
export class CommentNotFound extends Schema.TaggedError<CommentNotFound>()(
  "CommentNotFound",
  { ...errorEnvelope },
  {
    description: "The post has no such comment.",
    httpApiStatus: 404,
  }
) {}
