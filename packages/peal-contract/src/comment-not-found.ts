import { Schema } from "effect";

/** The post has no such comment. */
export class CommentNotFound extends Schema.TaggedError<CommentNotFound>()(
  "CommentNotFound",
  {},
  {
    description: "The post has no such comment.",
    httpApiStatus: 404,
  }
) {}
