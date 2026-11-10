import { Config, Effect, Layer } from "effect";

import { AccountPaceRef } from "#analytics/application/collect-accounts.ts";

import { analyticsConcurrencyConfig } from "./collection-pace.ts";

/**
 * The accounts collection's pace, with the concurrency
 * `PEAL_ANALYTICS_CONCURRENCY` gives the posts' collection too: the two
 * run at different minutes of the hour, and each channel takes one call at
 * a time through its gate whichever asks.
 */
export const AccountPaceLive = Layer.effect(
  AccountPaceRef,
  Effect.gen(function* AccountPaceLive() {
    const pace = yield* AccountPaceRef;

    const channelConcurrency = yield* analyticsConcurrencyConfig.pipe(
      Config.withDefault(pace.channelConcurrency)
    );

    return { ...pace, channelConcurrency };
  })
);
