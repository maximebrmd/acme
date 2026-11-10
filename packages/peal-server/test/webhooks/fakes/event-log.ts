import { Effect, Option } from "effect";

import type { Actor } from "#shared/domain/access.ts";
import { DeliveryStore } from "#webhooks/application/ports/delivery-store.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import type { WebhookEvent } from "#webhooks/domain/webhook-event.ts";

/**
 * The events sent to an endpoint so far, oldest first, as their receiver
 * would read them: for tests of what the other contexts publish.
 */
export const eventsSentTo = Effect.fn("eventsSentTo")(function* eventsSentTo(
  owner: Actor,
  endpointId: string
) {
  const deliveries = yield* WebhookDeliveries;
  const store = yield* DeliveryStore;

  const { items } = yield* deliveries.page(owner, endpointId, {
    after: Option.none(),
    limit: 100,
  });

  const recorded = yield* Effect.forEach(items.toReversed(), ({ eventId }) =>
    store.event(eventId)
  );

  return recorded.flatMap((event): readonly WebhookEvent[] =>
    Option.match(event, {
      onNone: () => [],
      onSome: (found) => [found.event],
    })
  );
});
