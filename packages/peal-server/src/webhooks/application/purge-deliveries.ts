import { Context, DateTime, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import {
  deliveryRetention,
  manualSendCountRetention,
} from "#webhooks/domain/delivery-policy.ts";

import { DeliveryStore } from "./ports/delivery-store.ts";
import { ManualSends } from "./ports/manual-sends.ts";

// Deliveries deleted per statement, so one run never holds long locks.
const batchSize = 500;

/**
 * Ends the delivery logs' retention: a delivery leaves its endpoint's log
 * `deliveryRetention` after it was made, and an event once none of its
 * deliveries is left; the counts of manual sends go a day after their
 * hour.
 */
export class PurgeDeliveries extends Context.Service<
  PurgeDeliveries,
  {
    /** Purges everything past its retention now, and says how much. */
    readonly purge: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/webhooks/application/PurgeDeliveries") {
  static readonly layer = Layer.effect(
    PurgeDeliveries,
    Effect.gen(function* PurgeDeliveriesLive() {
      const deliveries = yield* DeliveryStore;
      const manual = yield* ManualSends;

      const untilShort = (
        before: DateTime.Utc,
        total: number
      ): Effect.Effect<number, DatabaseError> =>
        deliveries
          .purge(before, batchSize)
          .pipe(
            Effect.flatMap((count) =>
              count < batchSize
                ? Effect.succeed(total + count)
                : untilShort(before, total + count)
            )
          );

      const purge = DateTime.now.pipe(
        Effect.flatMap((now) =>
          manual
            .purge(DateTime.subtractDuration(now, manualSendCountRetention))
            .pipe(
              Effect.andThen(
                untilShort(DateTime.subtractDuration(now, deliveryRetention), 0)
              )
            )
        ),
        Effect.withSpan("PurgeDeliveries.purge")
      );

      return PurgeDeliveries.of({ purge });
    })
  );
}
