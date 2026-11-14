import { Schema } from "effect";

import { ReviewReplyIdSchema } from "./review-reply-id.ts";

/** A reply to a review was asked to move on from a state that does not allow it. */
export class InvalidReviewReplyTransition extends Schema.TaggedError<InvalidReviewReplyTransition>()(
  "InvalidReviewReplyTransition",
  {
    from: Schema.Literals([
      "sending",
      "sent",
      "failed",
      "unconfirmed",
      "withdrawn",
    ]),
    replyId: ReviewReplyIdSchema,
  }
) {}
