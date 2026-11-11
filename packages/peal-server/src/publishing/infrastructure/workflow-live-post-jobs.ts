import { Effect, Layer } from "effect";
import { WorkflowEngine } from "effect/workflow";

import { LivePostJobs } from "#publishing/application/live-post-jobs.ts";

import { ChangeLivePostV1 } from "./workflows/change-live-post.ts";

/**
 * Starts and stops ChangeLivePostV1 executions. A start is a persisted
 * message: inside a TransactionRunner transaction it commits, or rolls
 * back, with the change, and the execution only runs after the commit.
 */
export const WorkflowLivePostJobs = Layer.effect(
  LivePostJobs,
  Effect.gen(function* WorkflowLivePostJobs() {
    const engine = yield* WorkflowEngine.WorkflowEngine;

    const withEngine = Effect.provideService(
      WorkflowEngine.WorkflowEngine,
      engine
    );

    return LivePostJobs.of({
      start: (changeId) =>
        ChangeLivePostV1.execute({ changeId }, { discard: true }).pipe(
          withEngine,
          Effect.asVoid
        ),
      stop: (changeId) =>
        Effect.gen(function* stop() {
          yield* ChangeLivePostV1.interrupt(
            yield* ChangeLivePostV1.executionId({ changeId })
          );
        }).pipe(withEngine),
    });
  })
);
