import { Schema } from "effect";

import { ReviewReplyFailureSchema } from "#engagement/domain/review-reply.ts";

/** The platform did not do what was asked about the review; nothing changed in Peal. */
export class ReviewActionFailed extends Schema.TaggedError<ReviewActionFailed>()(
  "ReviewActionFailed",
  { reason: ReviewReplyFailureSchema }
) {}
