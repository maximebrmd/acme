import { Effect, Layer } from "effect";

import { AnalyticsCoverage } from "#analytics/application/analytics-coverage.ts";
import { CountedPlatforms } from "#publishing/application/counted-platforms.ts";
import { xAnalyticsConfig } from "#shared/infrastructure/platforms/x-analytics.ts";

/**
 * The platforms the analytics context reads counts on, on this server: X
 * only where its operator turned X reads on (`X_ANALYTICS`).
 */
export const AnalyticsCountedPlatforms = Layer.effect(
  CountedPlatforms,
  Effect.gen(function* AnalyticsCountedPlatforms() {
    const coverage = yield* AnalyticsCoverage;

    return CountedPlatforms.of({
      includes: coverage.counts,
      numbers: coverage.numbers,
      numbersOn: coverage.numbersOn,
      onChannel: coverage.countsChannel,
    });
  })
).pipe(
  Layer.provide(
    Layer.unwrap(
      xAnalyticsConfig.pipe(
        Effect.map((x) => AnalyticsCoverage.layerWith({ x }))
      )
    )
  )
);
