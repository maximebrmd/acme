import { Effect, Layer } from "effect";
import { WorkflowEngine } from "effect/workflow";

import { DeliveryJobs } from "#webhooks/application/ports/delivery-jobs.ts";

import { DeliverWebhookV1 } from "./workflows/deliver-webhook.ts";

/**
 * Starts DeliverWebhookV1 for a delivery. A start is a persisted message:
 * inside a TransactionRunner transaction it commits, or rolls back, with
 * the delivery and the fact its event tells, and the execution only runs
 * after the commit. It is detached: an event published by a workflow's
 * step neither waits for its deliveries nor stops them.
 */
export const WorkflowDeliveryJobs = Layer.effect(
  DeliveryJobs,
  Effect.gen(function* WorkflowDeliveryJobs() {
    const engine = yield* WorkflowEngine.WorkflowEngine;

    return DeliveryJobs.of({
      start: (deliveryId) =>
        DeliverWebhookV1.execute(
          { deliveryId },
          { detached: true, discard: true }
        ).pipe(
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.asVoid
        ),
    });
  })
);
