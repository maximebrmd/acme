import { Context } from "effect";
import type { Effect } from "effect";

import type { ReviewReply } from "#engagement/domain/review-reply.ts";
import type { ReviewThread } from "#engagement/domain/review-thread.ts";
import type { Review } from "#engagement/domain/review.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Tells the workspace what happened to its locations' reviews, through
 * its webhook endpoints, in the transaction that records the fact, once.
 */
export class ReviewOutcomes extends Context.Service<
  ReviewOutcomes,
  {
    /** Reviews were read for the first time on the thread's location. */
    readonly received: (
      thread: ReviewThread,
      reviews: readonly Review[]
    ) => Effect.Effect<void, DatabaseError>;
    /** A reply ended: sent, failed or unconfirmed. */
    readonly replied: (
      thread: ReviewThread,
      reply: ReviewReply
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/engagement/application/ReviewOutcomes") {}
