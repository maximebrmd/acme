import { Context } from "effect";
import type { Effect } from "effect";

import type { ReviewReplyId } from "#engagement/domain/review-reply-id.ts";

/**
 * Starts the durable job that sends a reply to a review. Inside a
 * TransactionRunner transaction the start commits, or rolls back, with the
 * reply's journal row, and the job runs after the commit.
 */
export class ReviewReplyJobs extends Context.Service<
  ReviewReplyJobs,
  {
    readonly start: (replyId: ReviewReplyId) => Effect.Effect<void>;
    /**
     * Stops the reply's job for good, in a transaction with what hands the
     * reply to the next read, so the job cannot wake after.
     */
    readonly cancel: (replyId: ReviewReplyId) => Effect.Effect<void>;
  }
>()("peal-server/engagement/application/ReviewReplyJobs") {}
