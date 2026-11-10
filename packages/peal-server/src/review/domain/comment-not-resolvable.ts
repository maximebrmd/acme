import { Schema } from "effect";

import { ReviewCommentIdSchema } from "./review-ids.ts";

/** An answer in a thread is not resolved: the thread is. */
export class CommentNotResolvable extends Schema.TaggedError<CommentNotResolvable>()(
  "CommentNotResolvable",
  { commentId: ReviewCommentIdSchema }
) {}
