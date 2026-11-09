import { Schema } from "effect";

/** The workspace has no post with this id. */
export class PostNotFound extends Schema.TaggedError<PostNotFound>()(
  "PostNotFound",
  {},
  {
    description: "The workspace has no post with this id.",
    httpApiStatus: 404,
  }
) {}
