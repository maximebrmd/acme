import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Metric,
  Option,
  Ref,
  Result,
} from "effect";

import { readsReviewsOn } from "#engagement/domain/review-abilities.ts";
import { ReviewIdSchema } from "#engagement/domain/review-id.ts";
import { settleByReading } from "#engagement/domain/review-reply.ts";
import { ReviewThreadIdSchema } from "#engagement/domain/review-thread-id.ts";
import {
  followLocation,
  postponeReviewRead,
  recordReviewRead,
} from "#engagement/domain/review-thread.ts";
import type { ReviewThread } from "#engagement/domain/review-thread.ts";
import {
  keptSince,
  receiveReview,
  reconcileReviews,
} from "#engagement/domain/review.ts";
import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId, Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { ReviewLocations } from "./ports/review-locations.ts";
import { ReviewOutcomes } from "./ports/review-outcomes.ts";
import { ReviewSource } from "./ports/review-source.ts";
import type {
  ReviewsBatch,
  ReviewsReadFailure,
} from "./ports/review-source.ts";
import { ReviewStore } from "./ports/review-store.ts";
import { SendReviewReply } from "./send-review-reply.ts";

/** What a run of the reviews' collection did. */
export interface ReviewsReport {
  /** Locations connected since they were last listed, now followed. */
  readonly followed: number;
  /** Locations whose reviews were read. */
  readonly read: number;
  /** Locations put off: their channel paused, or the platform down. */
  readonly deferred: number;
  /** Replies no job settled, handed to the next read. */
  readonly stranded: number;
  /** Locations still due when the run ended. */
  readonly left: number;
}

/** How a run of the reviews' collection is paced. */
export interface ReviewsPace {
  /** How long after its scheduled time a run starts no more reads. */
  readonly budget: Duration.Duration;
  /** Locations read at the same time, each through its channel's gate. */
  readonly concurrency: number;
  /** Channels listed, and threads taken from the store, at a time. */
  readonly pageSize: number;
}

/**
 * The pace of the reviews' collection: 8 locations at a time, pages of
 * 500, for 40 minutes of each hourly run.
 */
export const ReviewsPaceRef = Context.Reference<ReviewsPace>(
  "peal-server/engagement/application/ReviewsPace",
  {
    defaultValue: () => ({
      budget: Duration.minutes(40),
      concurrency: 8,
      pageSize: 500,
    }),
  }
);

/** How long a location waits after a read its platform did not answer. */
export const reviewsRetryAfter = Duration.hours(1);

/** How long a location waits while its channel cannot be read. */
export const reviewsPausedFor = Duration.hours(6);

/** Locations still due when the last run ended: 0 while runs finish. */
export const reviewsLeft = Metric.gauge("peal.engagement.reviews.left", {
  description: "Locations whose reviews were still due when the last run ended",
});

/** Runs that stopped at their budget with locations still due. */
export const reviewsUnfinished = Metric.counter(
  "peal.engagement.reviews.unfinished",
  {
    description:
      "Reviews collection runs that could not finish in their budget",
    incremental: true,
  }
);

const emptyReport: ReviewsReport = {
  deferred: 0,
  followed: 0,
  left: 0,
  read: 0,
  stranded: 0,
};

// What one location's turn came to.
type Turn = "deferred" | "read" | "unreached";

/**
 * Reads the reviews of every location a workspace connected, on the
 * hourly collection, where the operator turned Google Business Profile on
 * (`PEAL_INBOX_PLATFORMS`): off, it follows nothing and calls nothing. A
 * run follows the locations connected since the last, then reads those
 * due, the ones that waited longest first, each through its channel's
 * gate, back to the oldest review Peal may keep (`reviewsKeptFor`). The
 * reconcile, the replies the read settles, the counts, the schedule and
 * what the workspace is told are saved in one transaction, under the
 * thread's lock.
 */
export class CollectReviews extends Context.Service<
  CollectReviews,
  {
    readonly run: (
      at: DateTime.Utc
    ) => Effect.Effect<ReviewsReport, DatabaseError>;
  }
>()("peal-server/engagement/application/CollectReviews") {
  static readonly layer = Layer.effect(
    CollectReviews,
    Effect.gen(function* CollectReviewsLive() {
      const locations = yield* ReviewLocations;
      const store = yield* ReviewStore;
      const source = yield* ReviewSource;
      const outcomes = yield* ReviewOutcomes;
      const sending = yield* SendReviewReply;
      const inbox = yield* CurrentInboxPlatforms;
      const pace = yield* ReviewsPaceRef;
      const { transaction } = yield* TransactionRunner;
      const ids = yield* Ids;

      // Follows every connected location not followed yet, a page of
      // channels at a time.
      const followAll = Effect.fn("CollectReviews.follow")(function* followAll(
        at: DateTime.Utc
      ) {
        let after = Option.none<ChannelId>();
        let followed = 0;

        for (;;) {
          const page = yield* locations.after(after, pace.pageSize);

          const threads = yield* Effect.all(
            page.locations.map((location) =>
              newId(ReviewThreadIdSchema).pipe(
                Effect.map((id) => followLocation(id, location, at))
              )
            )
          ).pipe(Effect.provideService(Ids, ids));

          followed += yield* store.follow(threads);

          if (Option.isNone(page.reached)) {
            return followed;
          }

          after = page.reached;
        }
      });

      // Saves what a read found, under the thread's lock: a thread whose
      // channel left meanwhile is gone, and nothing is kept.
      const record = Effect.fn("CollectReviews.record")(function* record(
        thread: ReviewThread,
        batch: ReviewsBatch,
        at: DateTime.Utc
      ) {
        yield* store.lockThread(thread.id);

        const current = yield* store.thread(thread.id);

        if (Option.isNone(current)) {
          return;
        }

        const now = yield* DateTime.now;
        const kept = yield* store.reviewsOf(thread.id);

        const changes = reconcileReviews(
          kept,
          batch.reviews,
          batch.complete,
          now
        );

        const fresh = yield* Effect.all(
          changes.fresh.map((reading) =>
            newId(ReviewIdSchema).pipe(
              Effect.map((id) => receiveReview(id, thread, reading, now))
            )
          )
        ).pipe(Effect.provideService(Ids, ids));

        const received = yield* store.saveReviews([
          ...changes.refreshed,
          ...fresh,
        ]);

        yield* store.deleteReviews(changes.gone);

        // A reply whose call got no answer is settled by what the review
        // holds now.
        const shown = new Map(
          changes.refreshed.map((review) => [review.id, review.reply])
        );

        for (const reply of yield* store.repliesOf(thread.id)) {
          const found = shown.get(reply.reviewId);

          if (reply.status._tag !== "unconfirmed" || found === undefined) {
            continue;
          }

          const settled = settleByReading(reply, found, now);

          if (
            Result.isSuccess(settled) &&
            (yield* store.advanceReply(settled.success, reply))
          ) {
            yield* outcomes.replied(thread, settled.success);
          }
        }

        yield* store.recount(thread.id);

        const latest = (yield* store.thread(thread.id)).pipe(
          Option.flatMap(({ lastReviewAt }) => lastReviewAt)
        );

        yield* store.saveThread(
          recordReviewRead(current.value.thread, batch, latest, now, at)
        );

        yield* outcomes.received(thread, received);
      });

      // A location whose channel left goes now, with what it held; one
      // that cannot be read waits.
      const putOff = (
        thread: ReviewThread,
        failure: ReviewsReadFailure,
        at: DateTime.Utc
      ) => {
        // Google asked to slow down: as long as it said, an hour at least.
        if (failure._tag === "RateLimited") {
          return store.saveThread(
            postponeReviewRead(
              thread,
              at,
              Duration.max(
                failure.retryAfter ?? reviewsRetryAfter,
                reviewsRetryAfter
              )
            )
          );
        }

        if (
          failure._tag === "ChannelUnreadable" &&
          failure.reason === "disconnected"
        ) {
          return store.channelGone(thread.channelId).pipe(Effect.asVoid);
        }

        return store.saveThread(
          postponeReviewRead(
            thread,
            at,
            failure._tag === "PlatformUnavailable"
              ? reviewsRetryAfter
              : reviewsPausedFor
          )
        );
      };

      const readOne = (
        thread: ReviewThread,
        at: DateTime.Utc,
        deadline: DateTime.Utc,
        halted: Ref.Ref<boolean>
      ): Effect.Effect<Turn, DatabaseError> =>
        Effect.gen(function* reading() {
          if (
            (yield* Ref.get(halted)) ||
            DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)
          ) {
            return "unreached" as const;
          }

          const read = yield* source
            .read({ channelId: thread.channelId, keptSince: keptSince(at) })
            .pipe(Effect.result);

          if (Result.isFailure(read)) {
            // The quota is the project's: no other location is asked this
            // run, and the next starts again.
            if (read.failure._tag === "RateLimited") {
              yield* Ref.set(halted, true);
            }

            yield* putOff(thread, read.failure, at);

            return "deferred" as const;
          }

          // One location never stops a run: one the database refuses, or a
          // fault breaks on, is put off and logged by its id alone, as the
          // failure may quote what people wrote.
          const putOffFailed = Effect.logWarning(
            "Could not record a location's reviews"
          ).pipe(
            Effect.annotateLogs({ threadId: thread.id }),
            Effect.andThen(
              store.saveThread(
                postponeReviewRead(thread, at, reviewsRetryAfter)
              )
            ),
            Effect.as("deferred" as const)
          );

          return yield* transaction(record(thread, read.success, at)).pipe(
            Effect.as("read" as const),
            Effect.catchTag("DatabaseError", () => putOffFailed),
            Effect.catchDefect(() => putOffFailed)
          );
        });

      const run = Effect.fn("CollectReviews.run")(function* run(
        at: DateTime.Utc
      ) {
        // Off, nothing is followed and nothing is called.
        if (!readsReviewsOn("googleBusiness", inbox)) {
          return emptyReport;
        }

        const stranded = yield* sending.settleStranded;
        const followed = yield* followAll(at);
        const deadline = DateTime.addDuration(at, pace.budget);
        const halted = yield* Ref.make(false);
        let read = 0;
        let deferred = 0;

        for (;;) {
          const due = yield* store.due(at, pace.pageSize);

          const turns = yield* Effect.forEach(
            due,
            (thread) => readOne(thread, at, deadline, halted),
            { concurrency: pace.concurrency }
          );

          read += turns.filter((turn) => turn === "read").length;
          deferred += turns.filter((turn) => turn === "deferred").length;

          // A page that reached its deadline, left nothing due, or could
          // move no location on.
          if (
            due.length < pace.pageSize ||
            turns.includes("unreached") ||
            turns.length === 0
          ) {
            break;
          }
        }

        const left = yield* store.countDue(at);

        yield* Metric.update(reviewsLeft, left);

        if (left > 0) {
          yield* Metric.update(reviewsUnfinished, 1);
        }

        const report: ReviewsReport = {
          deferred,
          followed,
          left,
          read,
          stranded,
        };

        return report;
      });

      return CollectReviews.of({ run });
    })
  );
}
