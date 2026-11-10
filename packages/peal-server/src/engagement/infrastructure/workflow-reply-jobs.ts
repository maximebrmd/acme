import { Effect, Layer } from "effect";
import { WorkflowEngine } from "effect/workflow";

import { ReplyJobs } from "#engagement/application/ports/reply-jobs.ts";

import { SendReplyV1 } from "./workflows/send-reply.ts";

/**
 * Starts SendReplyV1 for a reply. A start is a persisted message: inside a
 * TransactionRunner transaction it commits, or rolls back, with the
 * reply's journal row, and the execution only runs after the commit.
 */
export const WorkflowReplyJobs = Layer.effect(
  ReplyJobs,
  Effect.gen(function* WorkflowReplyJobs() {
    const engine = yield* WorkflowEngine.WorkflowEngine;

    return ReplyJobs.of({
      start: (replyId) =>
        SendReplyV1.execute(
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
