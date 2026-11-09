import { Context, Effect, Layer, Ref } from "effect";

import { NoticeDelivery } from "#notifications/application/notice-delivery.ts";

/**
 * A NoticeDelivery that records the keys it is asked to deliver, for tests
 * to deliver them with DeliverNoticeEmails when they choose.
 */
export class StartedDeliveries extends Context.Service<
  StartedDeliveries,
  { readonly keys: Effect.Effect<readonly string[]> }
>()("acme-server/test/notifications/StartedDeliveries") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* StartedDeliveriesLive() {
      const keys = yield* Ref.make<readonly string[]>([]);

      return Context.make(
        NoticeDelivery,
        NoticeDelivery.of({
          start: (key) => Ref.update(keys, (all) => [...all, key]),
        })
      ).pipe(Context.add(StartedDeliveries, { keys: Ref.get(keys) }));
    })
  );
}
