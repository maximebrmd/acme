import { Schema } from "effect";

import { ReviewLinkIdSchema } from "#review/domain/review-ids.ts";

/** The workspace has no such link. */
export class ReviewLinkNotFound extends Schema.TaggedError<ReviewLinkNotFound>()(
  "ReviewLinkNotFound",
  { linkId: ReviewLinkIdSchema }
) {}
