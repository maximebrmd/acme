import { Config, Effect, Layer, Schema } from "effect";

import { CollectionPaceRef } from "#analytics/application/collect-metrics.ts";

/**
 * `PEAL_ANALYTICS_CONCURRENCY`: how many channels the hourly collection
 * reads at the same time, 16 unless set. Each channel is read one call at
 * a time, through its gate, so this is also the most calls to platforms
 * the collection has under way. Anything but a whole number from 1 to 256
 * stops the server.
 */
export const analyticsConcurrencyConfig = Config.schema(
  Schema.Int.check(Schema.isBetween({ maximum: 256, minimum: 1 })),
  "PEAL_ANALYTICS_CONCURRENCY"
);

/** The collection's pace, with the concurrency the setting gives. */
export const CollectionPaceLive = Layer.effect(
  CollectionPaceRef,
  Effect.gen(function* CollectionPaceLive() {
    const pace = yield* CollectionPaceRef;

    const channelConcurrency = yield* analyticsConcurrencyConfig.pipe(
      Config.withDefault(pace.channelConcurrency)
    );

    return { ...pace, channelConcurrency };
  })
);
