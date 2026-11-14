import { Schema } from "effect";

import { ReviewThreadIdSchema } from "#engagement/domain/review-thread-id.ts";

/** The workspace has no such location's reviews. */
export class ReviewThreadNotFound extends Schema.TaggedError<ReviewThreadNotFound>()(
  "ReviewThreadNotFound",
  { threadId: ReviewThreadIdSchema }
) {}
