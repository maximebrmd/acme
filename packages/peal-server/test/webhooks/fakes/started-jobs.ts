import { Context, Effect, Layer, Ref } from "effect";

import { DeliveryJobs } from "#webhooks/application/ports/delivery-jobs.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";

/**
 * A DeliveryJobs that records the deliveries it is asked to start, for
 * tests to attempt them with DeliverWebhook when they choose.
 */
export class StartedJobs extends Context.Service<
  StartedJobs,
  { readonly deliveries: Effect.Effect<readonly WebhookDeliveryId[]> }
>()("peal-server/test/webhooks/StartedJobs") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* StartedJobsLive() {
      const started = yield* Ref.make<readonly WebhookDeliveryId[]>([]);

      return Context.make(
        DeliveryJobs,
        DeliveryJobs.of({
          start: (deliveryId) =>
            Ref.update(started, (all) => [...all, deliveryId]),
        })
      ).pipe(Context.add(StartedJobs, { deliveries: Ref.get(started) }));
    })
  );
}
