import { Effect, Layer } from "effect";
import { WorkflowEngine } from "effect/workflow";

import { ReviewReplyJobs } from "#engagement/application/ports/review-reply-jobs.ts";

import { SendReviewReplyV1 } from "./workflows/send-review-reply.ts";

/**
 * Starts SendReviewReplyV1 for a reply to a review. A start is a persisted
 * message: inside a TransactionRunner transaction it commits, or rolls
 * back, with the reply's journal row.
 */
export const WorkflowReviewReplyJobs = Layer.effect(
  ReviewReplyJobs,
  Effect.gen(function* WorkflowReviewReplyJobs() {
    const engine = yield* WorkflowEngine.WorkflowEngine;

    return ReviewReplyJobs.of({
      cancel: (replyId) =>
        SendReviewReplyV1.executionId({ replyId }).pipe(
          Effect.flatMap((executionId) =>
            SendReviewReplyV1.interrupt(executionId)
          ),
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.orDie
        ),
      start: (replyId) =>
        SendReviewReplyV1.execute(
          { replyId },
          { detached: true, discard: true }
        ).pipe(
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.asVoid,
          Effect.orDie
        ),
    });
  })
);
