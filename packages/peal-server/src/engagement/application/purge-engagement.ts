import { Context, DateTime, Effect, Layer } from "effect";

import { expireComment, isOnPlatform } from "#engagement/domain/comment.ts";
import { purgedBefore } from "#engagement/domain/engagement-retention.ts";
import type { ThreadId } from "#engagement/domain/thread-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";

import { EngagementStore } from "./ports/engagement-store.ts";

// Threads deleted, or listed to forget, per statement, so one run never
// holds long locks.
const batchSize = 200;

/**
 * Ends the retention of what other people wrote: a thread, its comments
 * and the replies sent under it are deleted `keptAfterCollection` after
 * Peal stopped reading the post's comments. Before that, on a platform
 * that bounds how long Peal keeps a comment without reading it again,
 * the comments of a thread not read again in time are forgotten (text and
 * author erased, ids kept), and a later read writes back those it finds.
 * The replies sent from Peal are the workspace's own, and stay.
 */
export class PurgeEngagement extends Context.Service<
  PurgeEngagement,
  {
    /**
     * Forgets the comments of every thread whose refresh bound passed
     * now, and says how many threads.
     */
    readonly forgetExpired: Effect.Effect<number, DatabaseError>;
    /**
     * Forgets what `forgetExpired` does, then purges every thread past
     * its retention now, and says how many it purged.
     */
    readonly purge: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/engagement/application/PurgeEngagement") {
  static readonly layer = Layer.effect(
    PurgeEngagement,
    Effect.gen(function* PurgeEngagementLive() {
      const store = yield* EngagementStore;
      const { transaction } = yield* TransactionRunner;

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

      // One thread's comments, under its lock as every writer of them
      // takes it, while its bound is still past: a read that came first
      // moved it, and what that read wrote stays.
      const forgetOne = (threadId: ThreadId, now: DateTime.Utc) =>
        transaction(
          Effect.gen(function* forgetting() {
            yield* store.lockThread(threadId);

            if (!(yield* store.clearRefresh(threadId, now))) {
              return 0;
            }

            const kept = yield* store.commentsOf(threadId);

            yield* store.saveComments(
              kept
                .filter(isOnPlatform)
                .map((comment) => expireComment(comment, now))
            );

            return 1;
          })
        );

      // Each listed thread's bound is gone or moved past `now` once it is
      // handled, so the next page lists others.
      const forgetFrom = (
        now: DateTime.Utc,
        total: number
      ): Effect.Effect<number, DatabaseError> =>
        store.expiring(now, batchSize).pipe(
          Effect.flatMap((threadIds) =>
            Effect.all(
              threadIds.map((threadId) => forgetOne(threadId, now))
            ).pipe(
              Effect.flatMap((forgotten) => {
                let sum = total;

                for (const one of forgotten) {
                  sum += one;
                }

                return threadIds.length < batchSize
                  ? Effect.succeed(sum)
                  : forgetFrom(now, sum);
              })
            )
          )
        );

      const forgetExpired = DateTime.now.pipe(
        Effect.flatMap((now) => forgetFrom(now, 0)),
        Effect.withSpan("PurgeEngagement.forgetExpired")
      );

      const purge = forgetExpired.pipe(
        Effect.andThen(DateTime.now),
        Effect.flatMap((now) => untilShort(purgedBefore(now), 0)),
        Effect.withSpan("PurgeEngagement.purge")
      );

      return PurgeEngagement.of({ forgetExpired, purge });
    })
  );
}
