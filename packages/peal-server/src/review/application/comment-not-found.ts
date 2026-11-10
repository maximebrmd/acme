import { Schema } from "effect";

import { ReviewCommentIdSchema } from "#review/domain/review-ids.ts";

/** The post has no such comment. */
export class CommentNotFound extends Schema.TaggedError<CommentNotFound>()(
  "CommentNotFound",
  { commentId: ReviewCommentIdSchema }
) {}
