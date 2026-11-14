import { Schema } from "effect";

import { ReviewIdSchema } from "#engagement/domain/review-id.ts";
import { ReviewReplyIdSchema } from "#engagement/domain/review-reply-id.ts";

/** A reply to the review is on its way, or may have gone out: it is settled before another is written. */
export class ReviewReplyPending extends Schema.TaggedError<ReviewReplyPending>()(
  "ReviewReplyPending",
  {
    replyId: ReviewReplyIdSchema,
    reviewId: ReviewIdSchema,
  }
) {}
