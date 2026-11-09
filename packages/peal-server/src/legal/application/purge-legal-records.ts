import { Context, DateTime, Effect, Layer } from "effect";

import { legalCutoffs } from "#legal/domain/legal-retention.ts";
import type { LegalCutoffs } from "#legal/domain/legal-retention.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { LegalStore } from "./ports/legal-store.ts";

// Records changed per statement, so one run never holds long locks.
const batchSize = 500;

/**
 * Ends what the law no longer has Peal keep (`#legal/domain/legal-retention.ts`):
 * a closed account's record 5 years after it closed, how it signed in and
 * paid after 1, each connection after 1, each answer to a legal request
 * after 5.
 */
export class PurgeLegalRecords extends Context.Service<
  PurgeLegalRecords,
  {
    /** Purges everything past its retention now, and says how much. */
    readonly purge: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/legal/application/PurgeLegalRecords") {
  static readonly layer = Layer.effect(
    PurgeLegalRecords,
    Effect.gen(function* PurgeLegalRecordsLive() {
      const store = yield* LegalStore;

      const untilShort = (
        cutoffs: LegalCutoffs,
        total: number
      ): Effect.Effect<number, DatabaseError> =>
        store
          .purgeBatch(cutoffs, batchSize)
          .pipe(
            Effect.flatMap((count) =>
              count === 0
                ? Effect.succeed(total)
                : untilShort(cutoffs, total + count)
            )
          );

      const purge = DateTime.now.pipe(
        Effect.flatMap((now) => untilShort(legalCutoffs(now), 0)),
        Effect.withSpan("PurgeLegalRecords.purge")
      );

      return PurgeLegalRecords.of({ purge });
    })
  );
}
