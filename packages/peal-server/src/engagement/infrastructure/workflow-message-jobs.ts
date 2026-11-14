import { Effect, Layer } from "effect";
import { WorkflowEngine } from "effect/workflow";

import { MessageJobs } from "#engagement/application/ports/message-jobs.ts";

import { SendMessageV1 } from "./workflows/send-message.ts";

/**
 * Starts SendMessageV1 for a direct message. A start is a persisted
 * message of the cluster, holding the message's id only: inside a
 * TransactionRunner transaction it commits, or rolls back, with the
 * message's journal row.
 */
export const WorkflowMessageJobs = Layer.effect(
  MessageJobs,
  Effect.gen(function* WorkflowMessageJobs() {
    const engine = yield* WorkflowEngine.WorkflowEngine;

    return MessageJobs.of({
      cancel: (messageId) =>
        SendMessageV1.executionId({ messageId }).pipe(
          Effect.flatMap((executionId) => SendMessageV1.interrupt(executionId)),
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.orDie
        ),
      start: (messageId) =>
        SendMessageV1.execute(
          { messageId },
          { detached: true, discard: true }
        ).pipe(
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.asVoid,
          Effect.orDie
        ),
    });
  })
);
