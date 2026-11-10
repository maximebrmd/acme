import { Context, DateTime, Effect, Layer } from "effect";

import { cutoffsAt } from "#review/domain/review-retention.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { ReviewArchive } from "./ports/review-archive.ts";
import type { ReviewPurge } from "./ports/review-archive.ts";

// Rows changed per statement, so one run never holds long locks.
const batchSize = 500;

// Runs of a purge, so one day's run ends whatever it finds.
const maxBatches = 200;

/**
 * Ends what visitors gave once it is past its retention
 * (`#review/domain/review-retention.ts`): the address they left to hear of
 * answers, 30 days after their link ended; their name, 24 months after
 * their comment or decision.
 */
export class PurgeReviewData extends Context.Service<
  PurgeReviewData,
  {
    /** Purges everything past its retention now, and says how much. */
    readonly purge: Effect.Effect<ReviewPurge, DatabaseError>;
  }
>()("peal-server/review/application/PurgeReviewData") {
  static readonly layer = Layer.effect(
    PurgeReviewData,
    Effect.gen(function* PurgeReviewDataLive() {
      const archive = yield* ReviewArchive;

      const purge = Effect.gen(function* purgeAll() {
        const cutoffs = cutoffsAt(yield* DateTime.now);
        let total: ReviewPurge = { names: 0 };

        for (let batch = 0; batch < maxBatches; batch += 1) {
          const purged = yield* archive.purge(cutoffs, batchSize);

          if (purged.names === 0) {
            break;
          }

          total = { names: total.names + purged.names };
        }

        return total;
      }).pipe(Effect.withSpan("PurgeReviewData.purge"));

      return PurgeReviewData.of({ purge });
    })
  );
}
