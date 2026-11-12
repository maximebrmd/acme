import { Context, DateTime, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { clickCutoff } from "#shortlinks/domain/click-retention.ts";

import { ShortLinkStore } from "./short-link-store.ts";

// Days deleted per statement, so one run never holds long locks.
const batchSize = 1000;

/** Ends the clicks' retention: deletes the days older than it keeps. */
export class PurgeClicks extends Context.Service<
  PurgeClicks,
  {
    /** Deletes every day past its retention now, and says how many. */
    readonly purge: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/shortlinks/application/PurgeClicks") {
  static readonly layer = Layer.effect(
    PurgeClicks,
    Effect.gen(function* PurgeClicksLive() {
      const store = yield* ShortLinkStore;

      const untilShort = (
        before: DateTime.Utc,
        total: number
      ): Effect.Effect<number, DatabaseError> =>
        store
          .purge(before, batchSize)
          .pipe(
            Effect.flatMap((count) =>
              count < batchSize
                ? Effect.succeed(total + count)
                : untilShort(before, total + count)
            )
          );

      return PurgeClicks.of({
        purge: DateTime.now.pipe(
          Effect.flatMap((now) => untilShort(clickCutoff(now), 0)),
          Effect.withSpan("PurgeClicks.purge")
        ),
      });
    })
  );
}
