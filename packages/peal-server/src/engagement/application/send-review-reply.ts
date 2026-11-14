import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Metric,
  Option,
  Result,
} from "effect";

import { callBound, strandedAfter } from "#engagement/domain/reply.ts";
import type { ReviewReplyId } from "#engagement/domain/review-reply-id.ts";
import {
  beginReviewReply,
  reviewReplyAttempted,
  settleByReading,
  settleReviewReply,
} from "#engagement/domain/review-reply.ts";
import type { ReviewSendOutcome } from "#engagement/domain/review-reply.ts";
import { postponeReviewRead } from "#engagement/domain/review-thread.ts";
import { withOwnerReply } from "#engagement/domain/review.ts";
import type { OwnerReply } from "#engagement/domain/review.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";

import { ReviewOutcomes } from "./ports/review-outcomes.ts";
import { ReviewReplyJobs } from "./ports/review-reply-jobs.ts";
import { ReviewReplySender } from "./ports/review-reply-sender.ts";
import { ReviewStore } from "./ports/review-store.ts";

/** Replies to reviews that ended, by how. */
export const reviewRepliesSettled = Metric.counter(
  "peal.engagement.review_replies",
  {
    description: "Replies to reviews that ended, by outcome",
    incremental: true,
  }
);

// The stranded replies one run hands over: there are few, if any.
const strandedPerRun = 100;

// The unconfirmed replies one run reads back.
const unconfirmedPerRun = 50;

/**
 * How long an unconfirmed reply waits for a read of its location before
 * its review alone is read back: the location's next read, brought
 * forward, usually settles it first.
 */
export const checkUnconfirmedAfter = Duration.hours(1);

/**
 * How a run of the job left its reply: `settled` with an outcome, or
 * `superseded` when there was nothing to send (the reply already ended,
 * or went with its review).
 */
export type ReviewSendResult = "settled" | "superseded";

/**
 * Sends one reply to a review, for the job its journal row started. A run
 * records that it sets out to call the platform, commits, and only then
 * calls; a run that finds the call already set out reads the review back
 * first, as setting the reply again shows it once. The outcome, the
 * review's reply as the platform answered it and what the workspace is
 * told are saved in one transaction. A reply whose outcome is unknown
 * waits for the next read of its location, brought forward to the next
 * run, which settles it. Replies to reviews count no outbound message.
 */
export class SendReviewReply extends Context.Service<
  SendReviewReply,
  {
    readonly run: (
      replyId: ReviewReplyId
    ) => Effect.Effect<ReviewSendResult, DatabaseError>;
    /**
     * Hands to the next read the replies no job settled: those still
     * `sending` `strandedAfter` they were written, with no call claimed in
     * the last `callBound`, become `unconfirmed`, and their job is stopped
     * in the same transaction. Answers how many.
     */
    readonly settleStranded: Effect.Effect<number, DatabaseError>;
    /**
     * Reads back the review of each reply left `unconfirmed`
     * `checkUnconfirmedAfter` ago or more, sending nothing, and settles it
     * from what the review holds (`settleByReading`), so a reply whose
     * location's reads do not reach its review is settled within hours.
     * One the platform cannot tell about waits for the next run. Answers
     * how many were settled.
     */
    readonly settleUnconfirmed: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/engagement/application/SendReviewReply") {
  static readonly layer = Layer.effect(
    SendReviewReply,
    Effect.gen(function* SendReviewReplyLive() {
      const store = yield* ReviewStore;
      const sender = yield* ReviewReplySender;
      const jobs = yield* ReviewReplyJobs;
      const outcomes = yield* ReviewOutcomes;
      const { transaction } = yield* TransactionRunner;

      // Saves how sending ended, unless the reply ended meanwhile.
      const settle = Effect.fn("SendReviewReply.settle")(function* settle(
        replyId: ReviewReplyId,
        outcome: ReviewSendOutcome
      ) {
        const now = yield* DateTime.now;
        const reply = yield* store.reply(replyId);

        if (Option.isNone(reply)) {
          return "superseded" as const;
        }

        yield* store.lockThread(reply.value.threadId);

        const settled = settleReviewReply(reply.value, outcome, now);
        const summary = yield* store.thread(reply.value.threadId);

        if (Result.isFailure(settled) || Option.isNone(summary)) {
          return "superseded" as const;
        }

        if (!(yield* store.advanceReply(settled.success, reply.value))) {
          return "superseded" as const;
        }

        const { thread } = summary.value;

        // Sent: the review holds this reply now, as Google answered it.
        if (outcome._tag === "sent") {
          const review = yield* store.review(settled.success.reviewId);

          yield* store.saveReviews(
            Option.toArray(review).map((found) =>
              withOwnerReply(found, Option.some(outcome.reply))
            )
          );
          yield* store.recount(thread.id);
        }

        // Unknown: the next run reads the location, and settles it.
        if (outcome._tag === "unconfirmed") {
          yield* store.saveThread(
            postponeReviewRead(thread, now, Duration.zero)
          );
        }

        yield* outcomes.replied(thread, settled.success);

        return "settled" as const;
      });

      const run = Effect.fn("SendReviewReply.run")(function* run(
        replyId: ReviewReplyId
      ) {
        const found = yield* store.reply(replyId);

        if (Option.isNone(found) || found.value.status._tag !== "sending") {
          return "superseded" as const;
        }

        const reply = found.value;
        const request = { channelId: reply.channelId, replyId };

        if (reviewReplyAttempted(reply)) {
          const outcome = yield* sender.resume(request);

          return yield* transaction(settle(replyId, outcome));
        }

        const begun = beginReviewReply(reply, yield* DateTime.now);

        // Committed before the call: from here on, the reply may be out.
        if (
          Result.isFailure(begun) ||
          !(yield* store.advanceReply(begun.success, reply))
        ) {
          return "superseded" as const;
        }

        const outcome = yield* sender.send(request);
        const result = yield* transaction(settle(replyId, outcome));

        if (result === "settled") {
          yield* Metric.update(
            Metric.withAttributes(reviewRepliesSettled, {
              outcome: outcome._tag,
            }),
            1
          );
        }

        return result;
      });

      const settleStranded = Effect.gen(function* settleStranded() {
        const now = yield* DateTime.now;

        const stranded = yield* store.strandedReplies(
          DateTime.subtractDuration(now, strandedAfter),
          DateTime.subtractDuration(now, callBound),
          strandedPerRun
        );

        let settled = 0;

        // One transaction a reply, its job stopped in it: it cannot wake
        // after, and the gate claims a reply before any call.
        for (const { id } of stranded) {
          const result = yield* transaction(
            settle(id, { _tag: "unconfirmed", reason: "interrupted" }).pipe(
              Effect.tap((ended) =>
                ended === "settled" ? jobs.cancel(id) : Effect.void
              )
            )
          );

          settled += result === "settled" ? 1 : 0;
        }

        return settled;
      }).pipe(Effect.withSpan("SendReviewReply.settleStranded"));

      // Settles an unconfirmed reply from its review as read back now.
      const settleFrom = Effect.fn("SendReviewReply.settleFrom")(
        function* settleFrom(
          replyId: ReviewReplyId,
          found: Option.Option<OwnerReply>
        ) {
          const now = yield* DateTime.now;
          const reply = yield* store.reply(replyId);

          if (Option.isNone(reply)) {
            return false;
          }

          yield* store.lockThread(reply.value.threadId);

          const settled = settleByReading(reply.value, found, now);
          const summary = yield* store.thread(reply.value.threadId);

          if (
            Result.isFailure(settled) ||
            Option.isNone(summary) ||
            !(yield* store.advanceReply(settled.success, reply.value))
          ) {
            return false;
          }

          if (settled.success.status._tag === "sent") {
            const review = yield* store.review(settled.success.reviewId);

            yield* store.saveReviews(
              Option.toArray(review).map((kept) => withOwnerReply(kept, found))
            );
            yield* store.recount(reply.value.threadId);
          }

          yield* outcomes.replied(summary.value.thread, settled.success);

          return true;
        }
      );

      const settleUnconfirmed = Effect.gen(function* settleUnconfirmed() {
        const now = yield* DateTime.now;

        const waiting = yield* store.unconfirmedReplies(
          DateTime.subtractDuration(now, checkUnconfirmedAfter),
          unconfirmedPerRun
        );

        let settled = 0;

        for (const reply of waiting) {
          const check = yield* sender.check({
            channelId: reply.channelId,
            replyId: reply.id,
          });

          if (check._tag === "unknown") {
            continue;
          }

          const found = check._tag === "found" ? check.reply : Option.none();

          settled += (yield* transaction(settleFrom(reply.id, found))) ? 1 : 0;
        }

        return settled;
      }).pipe(Effect.withSpan("SendReviewReply.settleUnconfirmed"));

      return SendReviewReply.of({ run, settleStranded, settleUnconfirmed });
    })
  );
}
