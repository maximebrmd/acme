import { Context, DateTime, Effect, Layer } from "effect";

import { purgedBefore } from "#engagement/domain/engagement-retention.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { EngagementStore } from "./ports/engagement-store.ts";

// Threads deleted per statement, so one run never holds long locks.
const batchSize = 200;

/**
 * Ends the retention of what other people wrote: a thread, its comments
 * and the replies sent under it are deleted `keptAfterCollection` after
 * Peal stopped reading the post's comments.
 */
export class PurgeEngagement extends Context.Service<
  PurgeEngagement,
  {
    /** Purges every thread past its retention now, and says how many. */
    readonly purge: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/engagement/application/PurgeEngagement") {
  static readonly layer = Layer.effect(
    PurgeEngagement,
    Effect.gen(function* PurgeEngagementLive() {
      const store = yield* EngagementStore;

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

      const purge = DateTime.now.pipe(
        Effect.flatMap((now) => untilShort(purgedBefore(now), 0)),
        Effect.withSpan("PurgeEngagement.purge")
      );

      return PurgeEngagement.of({ purge });
    })
  );
}
