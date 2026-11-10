import { Effect, Layer } from "effect";
import { WorkflowEngine } from "effect/workflow";

import { BoostJobs } from "#ads/application/ports/boost-jobs.ts";

import { PlaceBoostV1 } from "./workflows/place-boost.ts";

/**
 * Starts PlaceBoostV1 for a boost. A start is a persisted message: inside
 * a TransactionRunner transaction it commits, or rolls back, with the
 * boost, and the execution only runs after the commit. It is detached:
 * the request that asked for the boost does not wait for the network.
 */
export const WorkflowBoostJobs = Layer.effect(
  BoostJobs,
  Effect.gen(function* WorkflowBoostJobs() {
    const engine = yield* WorkflowEngine.WorkflowEngine;

    return BoostJobs.of({
      start: (boostId) =>
        PlaceBoostV1.execute(
          { boostId },
          { detached: true, discard: true }
        ).pipe(
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.asVoid
        ),
    });
  })
);
