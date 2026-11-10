import { Schema } from "effect";

import { CommentIdSchema } from "#engagement/domain/comment-id.ts";

/** The workspace has no such comment. */
export class CommentNotFound extends Schema.TaggedError<CommentNotFound>()(
  "CommentNotFound",
  {
    commentId: CommentIdSchema,
  }
) {}
