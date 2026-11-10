import { Schema } from "effect";

import { CommentIdSchema } from "#engagement/domain/comment-id.ts";

/** The comment is no longer on its platform: nothing can be done about it. */
export class CommentGone extends Schema.TaggedError<CommentGone>()(
  "CommentGone",
  {
    commentId: CommentIdSchema,
  }
) {}
