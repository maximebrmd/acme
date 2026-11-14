import { Effect, Layer } from "effect";
import { WorkflowEngine } from "effect/workflow";

import { FollowUpJobs } from "#publishing/application/follow-up-jobs.ts";

import { SendFollowUpV1 } from "./workflows/send-follow-up.ts";

/**
 * Starts SendFollowUpV1 for a follow-up. A start is a persisted message:
 * inside a TransactionRunner transaction it commits, or rolls back, with
 * the follow-up's state, and the execution only runs after the commit.
 */
export const WorkflowFollowUpJobs = Layer.effect(
  FollowUpJobs,
  Effect.gen(function* WorkflowFollowUpJobs() {
    const engine = yield* WorkflowEngine.WorkflowEngine;

    return FollowUpJobs.of({
      cancel: (followUpId) =>
        SendFollowUpV1.executionId({ followUpId }).pipe(
          Effect.flatMap((executionId) =>
            SendFollowUpV1.interrupt(executionId)
          ),
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.orDie
        ),
      start: (followUpId) =>
        SendFollowUpV1.execute(
          { followUpId },
          { detached: true, discard: true }
        ).pipe(
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.asVoid,
          Effect.orDie
        ),
    });
  })
);
