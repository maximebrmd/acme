import { DateTime, Effect } from "effect";

import { newId } from "#shared/application/ids.ts";
import type { RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import { WebhookDeliveryIdSchema } from "#webhooks/domain/webhook-delivery-id.ts";
import { createDelivery } from "#webhooks/domain/webhook-delivery.ts";
import type { WebhookEndpoint } from "#webhooks/domain/webhook-endpoint.ts";

import { DeliveryJobs } from "./ports/delivery-jobs.ts";
import { DeliveryStore } from "./ports/delivery-store.ts";

/**
 * Starts a delivery of a recorded event to an endpoint: its row in the
 * endpoint's log, and the job that makes its attempts. Call it in the
 * transaction that recorded the event, so both commit or neither.
 */
export const dispatch = Effect.fn("Webhooks.dispatch")(function* dispatch(
  endpoint: WebhookEndpoint,
  recorded: RecordedEvent
) {
  const delivery = createDelivery(
    yield* newId(WebhookDeliveryIdSchema),
    endpoint,
    { id: recorded.id, type: recorded.event.type },
    yield* DateTime.now
  );

  yield* DeliveryStore.use((deliveries) => deliveries.insert(delivery));
  yield* DeliveryJobs.use((jobs) => jobs.start(delivery.id));

  return delivery;
});
