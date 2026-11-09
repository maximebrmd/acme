import { Effect, Layer } from "effect";
import { WorkflowEngine } from "effect/workflow";

import { NoticeDelivery } from "#notifications/application/notice-delivery.ts";

import { DeliverNoticeV1 } from "./workflows/deliver-notice.ts";

/**
 * Starts DeliverNoticeV1 for an event. A start is a persisted message:
 * inside a TransactionRunner transaction it commits, or rolls back, with
 * the notices, and the execution only runs after the commit. It is
 * detached: an event noticed by a workflow's step neither waits for its
 * emails nor stops them.
 */
export const WorkflowNoticeDelivery = Layer.effect(
  NoticeDelivery,
  Effect.gen(function* WorkflowNoticeDelivery() {
    const engine = yield* WorkflowEngine.WorkflowEngine;

    return NoticeDelivery.of({
      start: (key) =>
        DeliverNoticeV1.execute(
          { key },
          { detached: true, discard: true }
        ).pipe(
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.asVoid
        ),
    });
  })
);
