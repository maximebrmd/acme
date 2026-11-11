import { Context, Duration, Effect, Layer, Ref } from "effect";

import { DeliveryJobs } from "#webhooks/application/ports/delivery-jobs.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";

/**
 * A DeliveryJobs that records the deliveries it is asked to start, and how
 * long each waits before its first attempt, for tests to attempt them with
 * DeliverWebhook when they choose.
 */
export class StartedJobs extends Context.Service<
  StartedJobs,
  {
    readonly deliveries: Effect.Effect<readonly WebhookDeliveryId[]>;
    readonly delays: Effect.Effect<
      ReadonlyMap<WebhookDeliveryId, Duration.Duration>
    >;
  }
>()("peal-server/test/webhooks/StartedJobs") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* StartedJobsLive() {
      const started = yield* Ref.make<
        readonly (readonly [WebhookDeliveryId, Duration.Duration])[]
      >([]);

      return Context.make(
        DeliveryJobs,
        DeliveryJobs.of({
          start: (deliveryId, startAfter = Duration.zero) =>
            Ref.update(started, (all) => [
              ...all,
              [deliveryId, startAfter] as const,
            ]),
        })
      ).pipe(
        Context.add(StartedJobs, {
          delays: Ref.get(started).pipe(Effect.map((all) => new Map(all))),
          deliveries: Ref.get(started).pipe(
            Effect.map((all) => all.map(([deliveryId]) => deliveryId))
          ),
        })
      );
    })
  );
}
