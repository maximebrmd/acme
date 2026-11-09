import { Effect, Layer } from "effect";
import { WorkflowEngine } from "effect/workflow";

import {
  ExecutionIdSchema,
  PublicationScheduler,
} from "#publishing/application/publication-scheduler.ts";

import { PublishPostV1 } from "./workflows/publish-post.ts";
import { PublishTargetV1 } from "./workflows/publish-target.ts";

/**
 * Starts and interrupts PublishPostV1 executions, and starts the
 * PublishTargetV1 execution of a reposted round, with no parent. A start is a
 * persisted message: inside a TransactionRunner transaction it commits, or
 * rolls back, with the post, and the execution only runs after the commit.
 */
export const WorkflowPublicationScheduler = Layer.effect(
  PublicationScheduler,
  Effect.gen(function* WorkflowPublicationScheduler() {
    const engine = yield* WorkflowEngine.WorkflowEngine;

    const withEngine = Effect.provideService(
      WorkflowEngine.WorkflowEngine,
      engine
    );

    return PublicationScheduler.of({
      cancel: (executionId) =>
        PublishPostV1.interrupt(executionId).pipe(withEngine),
      repost: ({ round, targetId }) =>
        PublishTargetV1.execute(
          { codeVersion: 1, round, targetId },
          { discard: true }
        ).pipe(withEngine, Effect.asVoid),
      schedule: ({ postId, revision, scheduledAt }) =>
        PublishPostV1.execute(
          { codeVersion: 1, postId, revision, scheduledAt },
          { discard: true }
        ).pipe(
          withEngine,
          Effect.map((executionId) => ExecutionIdSchema.make(executionId))
        ),
    });
  })
);
