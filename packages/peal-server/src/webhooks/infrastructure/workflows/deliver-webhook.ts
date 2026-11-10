import { Duration, Effect, Option, Schedule, Schema } from "effect";
import { Activity, DurableClock, Workflow } from "effect/workflow";

import { DeliverWebhook } from "#webhooks/application/deliver-webhook.ts";
import { retryDelayAfter } from "#webhooks/domain/delivery-policy.ts";
import { WebhookDeliveryIdSchema } from "#webhooks/domain/webhook-delivery-id.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";

// Persisted contract: the tag, the payload, the idempotency key, the
// activity names `attempt/<n>`, the clock names `retry/<n>`, and every
// result schema. Add payload fields with a decoding default, never rename
// or remove one; for anything else, add DeliverWebhookV2 beside this one.

/** How an attempt left its delivery, as the workflow stores it. */
export const AttemptResultSchema = Schema.Literals(["retry", "settled"]);

/**
 * Makes the attempts of one delivery, which the transaction that saved it
 * started. One execution per delivery, so starting it again does nothing
 * more; sending an event again is another delivery.
 */
export const DeliverWebhookV1 = Workflow.make("DeliverWebhookV1", {
  idempotencyKey: ({ deliveryId }) => deliveryId,
  payload: { deliveryId: WebhookDeliveryIdSchema },
});

// An activity's result is stored once and replayed, and a defect stored as
// a result ends the workflow. A database blip must not end it: the step
// retries for about three minutes, backing off up to 30 seconds, before it
// gives up.
const databaseRetry = Schedule.min([
  Schedule.exponential("200 millis", 2),
  Schedule.spaced("30 seconds"),
]);

// Each attempt is its own activity, so a replay reads how it ended instead
// of sending again.
const attempt = (deliveryId: WebhookDeliveryId, number: number) =>
  Activity.make({
    execute: DeliverWebhook.use((delivering) =>
      delivering.attempt(deliveryId, number)
    ).pipe(Effect.retry({ schedule: databaseRetry, times: 10 }), Effect.orDie),
    name: `attempt/${number}`,
    success: AttemptResultSchema,
  });

export const DeliverWebhookV1Live = DeliverWebhookV1.toLayer(
  Effect.fn("DeliverWebhookV1")(function* deliverWebhook({ deliveryId }) {
    let number = 1;
    let result = yield* attempt(deliveryId, number);

    // The use case fails the delivery once no delay is left, so the loop
    // ends with the schedule.
    while (result === "retry") {
      const delay = retryDelayAfter(number);

      if (Option.isNone(delay)) {
        return;
      }

      yield* DurableClock.sleep({
        duration: delay.value,
        inMemoryThreshold: Duration.zero,
        name: `retry/${number}`,
      });

      number += 1;
      result = yield* attempt(deliveryId, number);
    }
  })
);
