import { Context, DateTime, Effect, Layer } from "effect";

import { keptSince } from "#engagement/domain/review.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { ReviewStore } from "./ports/review-store.ts";
import type { ReviewsPurged } from "./ports/review-store.ts";

// What one pass deletes at most, of reviews and of threads: passes follow
// until one deletes less.
const perPass = 1000;

/**
 * Keeps no review longer than Google lets Peal keep what its API gives:
 * a review last changed `reviewsKeptFor` ago is deleted, with the replies
 * sent to it, and so is a location's thread no read reached in that time
 * (the platform turned off, the channel paused), with what it says of the
 * location. Run hourly, so nothing outlives its bound by more than an
 * hour, which the bound leaves room for.
 */
export class PurgeReviews extends Context.Service<
  PurgeReviews,
  { readonly purge: Effect.Effect<ReviewsPurged, DatabaseError> }
>()("peal-server/engagement/application/PurgeReviews") {
  static readonly layer = Layer.effect(
    PurgeReviews,
    Effect.gen(function* PurgeReviewsLive() {
      const store = yield* ReviewStore;

      const purge = Effect.gen(function* purge() {
        const since = keptSince(yield* DateTime.now);
        let reviews = 0;
        let threads = 0;

        for (;;) {
          const pass = yield* store.purge(since, perPass);

          reviews += pass.reviews;
          threads += pass.threads;

          if (pass.reviews < perPass && pass.threads < perPass) {
            const purged: ReviewsPurged = { reviews, threads };

            return purged;
          }
        }
      }).pipe(Effect.withSpan("PurgeReviews.purge"));

      return PurgeReviews.of({ purge });
    })
  );
}
