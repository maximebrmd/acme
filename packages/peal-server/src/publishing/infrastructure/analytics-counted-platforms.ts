import { Effect, Layer } from "effect";

import { AnalyticsCoverage } from "#analytics/application/analytics-coverage.ts";
import { CountedPlatforms } from "#publishing/application/counted-platforms.ts";

/** The platforms the analytics context reads counts on. */
export const AnalyticsCountedPlatforms = Layer.effect(
  CountedPlatforms,
  Effect.gen(function* AnalyticsCountedPlatforms() {
    const coverage = yield* AnalyticsCoverage;

    return CountedPlatforms.of({ includes: coverage.counts });
  })
).pipe(Layer.provide(AnalyticsCoverage.layer));
