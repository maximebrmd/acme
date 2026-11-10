import { Schema } from "effect";

import { CommentIdSchema } from "#engagement/domain/comment-id.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";

/** A reply to the comment is on its way, or may have gone out: it is settled before another is written, so the same answer never shows twice. */
export class ReplyPending extends Schema.TaggedError<ReplyPending>()(
  "ReplyPending",
  {
    commentId: CommentIdSchema,
    replyId: ReplyIdSchema,
  }
) {}
