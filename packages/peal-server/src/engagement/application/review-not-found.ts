import { Schema } from "effect";

import { ReviewIdSchema } from "#engagement/domain/review-id.ts";

/** The workspace has no such review. */
export class ReviewNotFound extends Schema.TaggedError<ReviewNotFound>()(
  "ReviewNotFound",
  { reviewId: ReviewIdSchema }
) {}
