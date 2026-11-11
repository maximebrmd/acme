import { Context, Deferred, Effect, Layer, Ref } from "effect";

import { DeliveryStore } from "#webhooks/application/ports/delivery-store.ts";
import { DrizzleDeliveryStore } from "#webhooks/infrastructure/drizzle-delivery-store.ts";

/**
 * The deliveries in Postgres, but once armed, the next replay to read which
 * of its deliveries were sent again waits there, inside its transaction,
 * until the test lets it go: what another replay does meanwhile shows
 * whether the two take turns.
 */
export class PausedReplay extends Context.Service<
  PausedReplay,
  {
    /** Makes the next replay wait, once. */
    readonly arm: Effect.Effect<void>;
    /** Done once that replay has read, and waits. */
    readonly reached: Deferred.Deferred<true>;
    readonly release: Deferred.Deferred<true>;
  }
>()("peal-server/test/webhooks/PausedReplay") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* PausedReplayLive() {
      const store = yield* DeliveryStore;
      const reached = yield* Deferred.make<true>();
      const release = yield* Deferred.make<true>();
      const armed = yield* Ref.make(false);

      const waitOnce = Ref.getAndSet(armed, false).pipe(
        Effect.flatMap((waits) =>
          waits
            ? Deferred.succeed(reached, true).pipe(
                Effect.andThen(Deferred.await(release))
              )
            : Effect.void
        )
      );

      return Context.make(
        DeliveryStore,
        DeliveryStore.of({
          ...store,
          sentAgain: (among) =>
            store.sentAgain(among).pipe(Effect.tap(() => waitOnce)),
        })
      ).pipe(
        Context.add(PausedReplay, {
          arm: Ref.set(armed, true),
          reached,
          release,
        })
      );
    })
  ).pipe(Layer.provide(DrizzleDeliveryStore));
}
