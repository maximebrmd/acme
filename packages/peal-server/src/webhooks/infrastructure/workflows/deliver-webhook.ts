import { Duration, Effect, Option, Schedule, Schema } from "effect";
import { Activity, DurableClock, Workflow } from "effect/workflow";

import { DeliverWebhook } from "#webhooks/application/deliver-webhook.ts";
import { retryDelayAfter } from "#webhooks/domain/delivery-policy.ts";
import { WebhookDeliveryIdSchema } from "#webhooks/domain/webhook-delivery-id.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";

// Persisted contract: the tag, the payload, the idempotency key, the
// activity names `attempt/<n>` and `attempt/<n>/again/<k>`, the clock names
// `start`, `retry/<n>` and `recover/<n>/<k>`, and every result schema. Add payload
// fields with a decoding default, never rename or remove one; for anything
// else, add DeliverWebhookV2 beside this one.

/**
 * How an attempt left its delivery, as the workflow stores it. `unrecorded`
 * is an attempt the database would not let the server read or record: the
 * delivery is as it was.
 */
export const AttemptResultSchema = Schema.Literals([
  "retry",
  "settled",
  "unrecorded",
]);

/**
 * Makes the attempts of one delivery, which the transaction that saved it
 * started. One execution per delivery, so starting it again does nothing
 * more; sending an event again is another delivery.
 */
export const DeliverWebhookV1 = Workflow.make("DeliverWebhookV1", {
  idempotencyKey: ({ deliveryId }) => deliveryId,
  payload: {
    deliveryId: WebhookDeliveryIdSchema,
    // How long to wait before the first attempt, to space out deliveries
    // sent again together; none for those started before it was asked.
    startAfterMillis: Schema.Int.pipe(
      Schema.withDecodingDefault(Effect.succeed(0))
    ),
  },
});

// An activity's result is stored once and replayed. A database blip must
// not end the delivery: the step retries for about three minutes, backing
// off up to 30 seconds.
const databaseRetry = Schedule.min([
  Schedule.exponential("200 millis", 2),
  Schedule.spaced("30 seconds"),
]);

/**
 * A database that fails for longer leaves the attempt `unrecorded`: the
 * workflow sleeps `recoveryDelay`, durably, and makes the same attempt
 * again, `maxRecoveries` times at most (a day), so a delivery never stays
 * pending with nothing left to attempt it because the database was away
 * for minutes.
 */
export const recoveryDelay = Duration.minutes(30);
export const maxRecoveries = 48;

// Each attempt is its own activity, so a replay reads how it ended instead
// of sending again. `recovery` counts the times the same attempt was made
// again after the database failed it.
const attempt = (
  deliveryId: WebhookDeliveryId,
  number: number,
  recovery: number
) =>
  Activity.make({
    execute: DeliverWebhook.use((delivering) =>
      delivering.attempt(deliveryId, number)
    ).pipe(
      Effect.retry({ schedule: databaseRetry, times: 10 }),
      Effect.catchTag("DatabaseError", (failed) =>
        Effect.logError(
          "A webhook attempt could not be read or recorded",
          failed
        ).pipe(
          Effect.annotateLogs({ attempt: number, deliveryId, recovery }),
          Effect.as("unrecorded" as const)
        )
      )
    ),
    name:
      recovery === 0
        ? `attempt/${number}`
        : `attempt/${number}/again/${recovery}`,
    success: AttemptResultSchema,
  });

// An attempt, made again after each recovery delay while the database
// fails it.
const recorded = Effect.fn("DeliverWebhookV1.recorded")(function* recorded(
  deliveryId: WebhookDeliveryId,
  number: number
) {
  let recovery = 0;
  let result = yield* attempt(deliveryId, number, recovery);

  while (result === "unrecorded" && recovery < maxRecoveries) {
    recovery += 1;

    yield* DurableClock.sleep({
      duration: recoveryDelay,
      inMemoryThreshold: Duration.zero,
      name: `recover/${number}/${recovery}`,
    });

    result = yield* attempt(deliveryId, number, recovery);
  }

  return result;
});

export const DeliverWebhookV1Live = DeliverWebhookV1.toLayer(
  Effect.fn("DeliverWebhookV1")(function* deliverWebhook({
    deliveryId,
    startAfterMillis,
  }) {
    // A few seconds at most: slept in memory, and again after a restart.
    yield* DurableClock.sleep({
      duration: Duration.millis(startAfterMillis),
      name: "start",
    });

    let number = 1;
    let result = yield* recorded(deliveryId, number);

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
      result = yield* recorded(deliveryId, number);
    }

    if (result === "unrecorded") {
      yield* Effect.logError(
        "A webhook delivery was given up: the database failed its attempts for a day"
      ).pipe(Effect.annotateLogs({ deliveryId }));
    }
  })
);
