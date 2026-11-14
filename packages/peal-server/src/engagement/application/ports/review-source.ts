import { Context, Schema } from "effect";
import type { Effect } from "effect";

import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import { ReviewReadingSchema } from "#engagement/domain/review.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";

/**
 * A location to read, by its channel: its reviews written or changed
 * since `keptSince`, the oldest Peal may keep. Ids and an instant only.
 */
export const ReviewsRequestSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  keptSince: Schema.DateTimeUtc,
});

export type ReviewsRequest = typeof ReviewsRequestSchema.Type;

/**
 * What a read of a location found: its reviews from the latest changed
 * back to `keptSince`, whether that is all of them (`complete`: a review
 * Peal keeps that a complete read no longer finds was deleted on the
 * platform), and what the platform says of the location as a whole.
 */
export const ReviewsBatchSchema = Schema.Struct({
  averageRating: Schema.Option(Schema.Number),
  complete: Schema.Boolean,
  reviews: Schema.Array(ReviewReadingSchema),
  totalReviewCount: Schema.Option(Schema.Int),
});

export type ReviewsBatch = typeof ReviewsBatchSchema.Type;

/**
 * Why nothing was read: the channel, the platform being down, or the
 * platform asking to slow down (the project's quota is shared by every
 * location and by publishing), for as long as it said.
 */
export const ReviewsReadFailureSchema = Schema.Union([
  ChannelUnreadable,
  PlatformUnavailable,
  RateLimited,
]);

export type ReviewsReadFailure = typeof ReviewsReadFailureSchema.Type;

/**
 * Reads a location's reviews on its platform. The platform's reader does
 * it; the collection runs it through the channel's gate, one call at a
 * time with the channel's publishing.
 */
export class ReviewSource extends Context.Service<
  ReviewSource,
  {
    readonly read: (
      request: ReviewsRequest
    ) => Effect.Effect<ReviewsBatch, ReviewsReadFailure>;
  }
>()("peal-server/engagement/application/ReviewSource") {}
