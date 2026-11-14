import { Schema } from "effect";

import { ReviewIdSchema } from "#engagement/domain/review-id.ts";

/**
 * Only a member signed in to Peal, in person, answers a review or deletes
 * its reply: not an API key, nor an application acting for them (an MCP
 * client, the command line). Google's Business Profile API policies ask
 * that review replies never be automated or triggered without the user's
 * prior specific and express consent, which Peal does not record yet.
 */
export class ReviewReplyNeedsPerson extends Schema.TaggedError<ReviewReplyNeedsPerson>()(
  "ReviewReplyNeedsPerson",
  { reviewId: ReviewIdSchema }
) {}
