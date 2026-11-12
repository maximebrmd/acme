import { Context, DateTime, Effect, Layer, Metric, Option } from "effect";

import { expireComment, isOnPlatform } from "#engagement/domain/comment.ts";
import { purgedBefore } from "#engagement/domain/engagement-retention.ts";
import type { ThreadId } from "#engagement/domain/thread-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";

import { EngagementStore } from "./ports/engagement-store.ts";
import type { ExpiringThread } from "./ports/engagement-store.ts";

// Threads deleted, or listed to forget, per statement, so one run never
// holds long locks.
const batchSize = 200;

/**
 * Threads whose comments the retention could not forget at their bound,
 * each time one fails. One that keeps failing counts at every run: an
 * alert watches it (`peal-comments-forget-failing`).
 */
export const forgetFailures = Metric.counter(
  "peal.engagement.retention.forget_failures",
  {
    description:
      "Threads whose comments could not be forgotten at their platform's bound",
    incremental: true,
  }
);

// How forgetting one thread ended.
type Forgot = "failed" | "forgotten" | "kept";

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
      // One thread that fails never stops the others: it is counted and
      // named by id alone, never with the failure, which may quote what
      // people wrote, and the next run tries it again.
      const forgetOne = (
        threadId: ThreadId,
        now: DateTime.Utc
      ): Effect.Effect<Forgot> => {
        const failed = (kind: "database" | "fault") =>
          Effect.logWarning(
            "A thread's comments could not be forgotten at their platform's bound: the next run tries again"
          ).pipe(
            Effect.annotateLogs({ kind, threadId }),
            Effect.andThen(Metric.update(forgetFailures, 1)),
            Effect.as<Forgot>("failed")
          );

        return transaction(
          Effect.gen(function* forgetting() {
            yield* store.lockThread(threadId);

            if (!(yield* store.clearRefresh(threadId, now))) {
              return "kept" as const;
            }

            const kept = yield* store.commentsOf(threadId);

            yield* store.saveComments(
              kept
                .filter(isOnPlatform)
                .map((comment) => expireComment(comment, now))
            );

            return "forgotten" as const;
          })
        ).pipe(
          Effect.catchTag("DatabaseError", () => failed("database")),
          Effect.catchDefect(() => failed("fault"))
        );
      };

      // Each listed thread's bound is gone or moved past `now` once it is
      // handled, so the next page lists others.
      // Page after page in the listing's order, from after the last
      // thread listed: one that failed stays behind, and the threads past
      // it are still forgotten; the next run tries it again.
      const forgetFrom = (
        now: DateTime.Utc,
        after: Option.Option<ExpiringThread>,
        total: number
      ): Effect.Effect<number, DatabaseError> =>
        store.expiring(now, batchSize, after).pipe(
          Effect.flatMap((listed) =>
            Effect.all(
              listed.map(({ threadId }) => forgetOne(threadId, now))
            ).pipe(
              Effect.flatMap((outcomes) => {
                const forgotten = outcomes.filter(
                  (outcome) => outcome === "forgotten"
                ).length;

                return listed.length < batchSize
                  ? Effect.succeed(total + forgotten)
                  : forgetFrom(
                      now,
                      Option.fromUndefinedOr(listed.at(-1)),
                      total + forgotten
                    );
              })
            )
          )
        );

      const forgetExpired = DateTime.now.pipe(
        Effect.flatMap((now) => forgetFrom(now, Option.none(), 0)),
        Effect.withSpan("PurgeEngagement.forgetExpired")
      );

      // The retention's deletion runs whatever the forgetting met: a
      // store it could not list is logged, and the deletion goes on.
      const purge = forgetExpired.pipe(
        Effect.catchTag("DatabaseError", () =>
          Effect.logWarning(
            "The comments past their platform's bound could not be listed: the deletion goes on"
          )
        ),
        Effect.andThen(DateTime.now),
        Effect.flatMap((now) => untilShort(purgedBefore(now), 0)),
        Effect.withSpan("PurgeEngagement.purge")
      );

      return PurgeEngagement.of({ forgetExpired, purge });
    })
  );
}
