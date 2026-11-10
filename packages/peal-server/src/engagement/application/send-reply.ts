import {
  Context,
  DateTime,
  Effect,
  Layer,
  Metric,
  Option,
  Result,
} from "effect";

import { markAnswered } from "#engagement/domain/comment.ts";
import type { ReplyId } from "#engagement/domain/reply-id.ts";
import {
  beginSending,
  callBound,
  settleReply,
  strandedAfter,
  wasAttempted,
} from "#engagement/domain/reply.ts";
import type { SendOutcome } from "#engagement/domain/reply.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";

import { EngagementOutcomes } from "./ports/engagement-outcomes.ts";
import { EngagementStore } from "./ports/engagement-store.ts";
import { ReplyJobs } from "./ports/reply-jobs.ts";
import { ReplySender } from "./ports/reply-sender.ts";

/** Replies that ended, by how. */
export const repliesSettled = Metric.counter("peal.engagement.replies", {
  description: "Replies to comments that ended, by outcome",
  incremental: true,
});

// The stranded replies one run hands over: there are few, if any.
const strandedPerRun = 100;

/**
 * How a run of the job left its reply: `settled` with an outcome, or
 * `superseded` when there was nothing to send (the reply already ended, or
 * went with its workspace).
 */
export type SendResult = "settled" | "superseded";

/**
 * Sends one reply, for the job its journal row started. The row is the
 * journal: a run records that it sets out to call the platform, commits,
 * and only then calls. A run that finds the call already set out (the
 * server stopped in between) does not send: it asks the platform whether
 * the reply is there, and leaves it `unconfirmed` when the platform cannot
 * say. The outcome, the comment's answer and what the workspace is told
 * are saved in one transaction.
 */
export class SendReply extends Context.Service<
  SendReply,
  {
    readonly run: (
      replyId: ReplyId
    ) => Effect.Effect<SendResult, DatabaseError>;
    /**
     * Hands to a person the replies no job settled: those still `sending`
     * `strandedAfter` they were written, and whose call to the platform,
     * if a gate claimed one, was claimed `callBound` ago or more, become
     * `unconfirmed`, which a member settles after checking the platform.
     * The reply's job is stopped in the same transaction, and a gate
     * refuses a reply that is no longer on its way: nothing is sent after
     * the handover, nor looked up. Answers how many.
     */
    readonly settleStranded: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/engagement/application/SendReply") {
  static readonly layer = Layer.effect(
    SendReply,
    Effect.gen(function* SendReplyLive() {
      const store = yield* EngagementStore;
      const sender = yield* ReplySender;
      const jobs = yield* ReplyJobs;
      const outcomes = yield* EngagementOutcomes;
      const { transaction } = yield* TransactionRunner;

      // Saves how sending ended, unless the reply ended meanwhile.
      const settle = Effect.fn("SendReply.settle")(function* settle(
        replyId: ReplyId,
        outcome: SendOutcome
      ) {
        const now = yield* DateTime.now;
        const reply = yield* store.reply(replyId);

        if (Option.isNone(reply)) {
          return "superseded" as const;
        }

        const settled = settleReply(reply.value, outcome, now);

        if (Result.isFailure(settled)) {
          return "superseded" as const;
        }

        const summary = yield* store.thread(settled.success.threadId);

        if (Option.isNone(summary)) {
          return "superseded" as const;
        }

        // Only from the state it was read in: a reply a person, or the
        // handover of stranded replies, settled meanwhile stays as they
        // left it.
        if (!(yield* store.advanceReply(settled.success, reply.value))) {
          return "superseded" as const;
        }

        // A reply that went out, or may have, answers its comment.
        if (outcome._tag !== "failed") {
          const comment = yield* store.comment(settled.success.commentId);

          yield* store.saveComments(
            Option.toArray(comment).map((found) => markAnswered(found, now))
          );
        }

        yield* outcomes.replied(summary.value.thread, settled.success);

        return "settled" as const;
      });

      const run = Effect.fn("SendReply.run")(function* run(replyId: ReplyId) {
        const found = yield* store.reply(replyId);

        if (Option.isNone(found) || found.value.status._tag !== "sending") {
          return "superseded" as const;
        }

        const reply = found.value;
        const request = { channelId: reply.channelId, replyId };

        if (wasAttempted(reply)) {
          const outcome = yield* sender.resume(request);

          return yield* transaction(settle(replyId, outcome));
        }

        const begun = beginSending(reply, yield* DateTime.now);

        if (Result.isFailure(begun)) {
          return "superseded" as const;
        }

        // Committed before the call: from here on, the reply may be out.
        // Another run that began meanwhile, or a person who settled the
        // reply, keeps it: this run sends nothing.
        if (!(yield* store.advanceReply(begun.success, reply))) {
          return "superseded" as const;
        }

        const outcome = yield* sender.send(request);
        const result = yield* transaction(settle(replyId, outcome));

        if (result === "settled") {
          yield* Metric.update(
            Metric.withAttributes(repliesSettled, { outcome: outcome._tag }),
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

        // One transaction a reply, so one that fails undoes no other. Its
        // job is stopped in the same transaction: it cannot wake after
        // the reply is a person's to settle, and the gate, which claims a
        // reply before any call, refuses one that is no longer on its way.
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

        yield* Metric.update(
          Metric.withAttributes(repliesSettled, { outcome: "unconfirmed" }),
          settled
        );

        return settled;
      }).pipe(Effect.withSpan("SendReply.settleStranded"));

      return SendReply.of({ run, settleStranded });
    })
  );
}
