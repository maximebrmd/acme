import { Context, DateTime, Effect, Layer } from "effect";

import {
  disconnectedKeptFor,
  keptFor,
  paidReadsKeptFor,
  platformCaps,
  retentionOf,
} from "#analytics/domain/analytics-retention.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";

import { ExpiredAnalytics } from "./expired-analytics.ts";
import type { PurgeReport } from "./expired-analytics.ts";

/**
 * Deletes what analytics kept past its retention, run by the daily
 * retention job: posts' counts and accounts' days older than their
 * platform's cap, or than two years; the posts of channels that left their
 * workspace a month after it did; and the counts of
 * billed reads past 35 days.
 */
export class PurgeAnalytics extends Context.Service<
  PurgeAnalytics,
  {
    /** Purges everything past its retention at `now`, and says how much. */
    readonly purge: (
      now: DateTime.Utc
    ) => Effect.Effect<PurgeReport, DatabaseError>;
  }
>()("peal-server/analytics/application/PurgeAnalytics") {
  static readonly layer = Layer.effect(
    PurgeAnalytics,
    Effect.gen(function* PurgeAnalyticsLive() {
      const expired = yield* ExpiredAnalytics;

      const purge = (now: DateTime.Utc) =>
        expired
          .delete({
            before: DateTime.subtractDuration(now, keptFor),
            byPlatform: PlatformSchema.literals
              .filter((platform) => platform in platformCaps)
              .map((platform) => ({
                before: DateTime.subtractDuration(now, retentionOf(platform)),
                platform,
              })),
            disconnectedBefore: DateTime.subtractDuration(
              now,
              disconnectedKeptFor
            ),
            paidReadsBefore: DateTime.subtractDuration(now, paidReadsKeptFor),
          })
          .pipe(Effect.withSpan("PurgeAnalytics.purge"));

      return PurgeAnalytics.of({ purge });
    })
  );
}
