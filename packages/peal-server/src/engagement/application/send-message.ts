import {
  Context,
  DateTime,
  Effect,
  Layer,
  Metric,
  Option,
  Result,
} from "effect";

import type { OutgoingMessageId } from "#engagement/domain/outgoing-message-id.ts";
import {
  beginMessage,
  messageAttempted,
  settleMessage,
} from "#engagement/domain/outgoing-message.ts";
import type { MessageSendOutcome } from "#engagement/domain/outgoing-message.ts";
import { callBound, strandedAfter } from "#engagement/domain/reply.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";

import { claimOf } from "./outgoing-message-claim.ts";
import { MessageJobs } from "./ports/message-jobs.ts";
import { MessageOutcomes } from "./ports/message-outcomes.ts";
import { MessageSender } from "./ports/message-sender.ts";
import { MessageStore } from "./ports/message-store.ts";
import type { SendResult } from "./send-reply.ts";

/** Messages sent from Peal that ended, by how. */
export const messagesSettled = Metric.counter("peal.engagement.messages", {
  description: "Direct messages sent from Peal that ended, by outcome",
  incremental: true,
});

// The stranded messages one run hands over: there are few, if any.
const strandedPerRun = 100;

/**
 * Sends one message, for the job its journal row started, as a reply to a
 * comment is sent: a run records that it sets out to call the platform,
 * commits, and only then calls; a run that finds the call already set out
 * does not send, it asks the platform whether the message is there, and
 * leaves it `unconfirmed` when the platform cannot say. The outcome, what
 * the workspace is told and, for a message that never went out, its
 * outbound message given back are saved in one transaction.
 */
export class SendMessage extends Context.Service<
  SendMessage,
  {
    readonly run: (
      messageId: OutgoingMessageId
    ) => Effect.Effect<SendResult, DatabaseError>;
    /**
     * Hands to a person the messages no job settled, as `SendReply` does
     * replies: those still `sending` `strandedAfter` they were written,
     * with no call claimed in the last `callBound`, become `unconfirmed`,
     * their job stopped in the same transaction. Answers how many.
     */
    readonly settleStranded: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/engagement/application/SendMessage") {
  static readonly layer = Layer.effect(
    SendMessage,
    Effect.gen(function* SendMessageLive() {
      const store = yield* MessageStore;
      const sender = yield* MessageSender;
      const jobs = yield* MessageJobs;
      const outcomes = yield* MessageOutcomes;
      const { transaction } = yield* TransactionRunner;
      const meters = yield* MeteredUsage;

      // Saves how sending ended, unless the message ended meanwhile.
      const settle = Effect.fn("SendMessage.settle")(function* settle(
        messageId: OutgoingMessageId,
        outcome: MessageSendOutcome
      ) {
        const now = yield* DateTime.now;
        const message = yield* store.outgoing(messageId);

        if (Option.isNone(message)) {
          return "superseded" as const;
        }

        const settled = settleMessage(message.value, outcome, now);

        if (Result.isFailure(settled)) {
          return "superseded" as const;
        }

        const summary = yield* store.conversation(
          settled.success.conversationId
        );

        if (Option.isNone(summary)) {
          return "superseded" as const;
        }

        // Only from the state it was read in.
        if (!(yield* store.advanceMessage(settled.success, message.value))) {
          return "superseded" as const;
        }

        // A message that never went out gives its outbound message back.
        if (outcome._tag === "failed") {
          yield* meters.giveBack(claimOf(settled.success));
        }

        yield* outcomes.settled(summary.value.conversation, settled.success);

        return "settled" as const;
      });

      const run = Effect.fn("SendMessage.run")(function* run(
        messageId: OutgoingMessageId
      ) {
        const found = yield* store.outgoing(messageId);

        if (Option.isNone(found) || found.value.status._tag !== "sending") {
          return "superseded" as const;
        }

        const message = found.value;
        const request = { channelId: message.channelId, messageId };

        if (messageAttempted(message)) {
          const outcome = yield* sender.resume(request);

          return yield* transaction(settle(messageId, outcome));
        }

        const begun = beginMessage(message, yield* DateTime.now);

        if (Result.isFailure(begun)) {
          return "superseded" as const;
        }

        // Committed before the call: from here on, the message may be out.
        if (!(yield* store.advanceMessage(begun.success, message))) {
          return "superseded" as const;
        }

        const outcome = yield* sender.send(request);
        const result = yield* transaction(settle(messageId, outcome));

        if (result === "settled") {
          yield* Metric.update(
            Metric.withAttributes(messagesSettled, { outcome: outcome._tag }),
            1
          );
        }

        return result;
      });

      const settleStranded = Effect.gen(function* settleStranded() {
        const now = yield* DateTime.now;

        const stranded = yield* store.strandedMessages(
          DateTime.subtractDuration(now, strandedAfter),
          DateTime.subtractDuration(now, callBound),
          strandedPerRun
        );

        let settled = 0;

        // One transaction a message, its job stopped in it.
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
          Metric.withAttributes(messagesSettled, { outcome: "unconfirmed" }),
          settled
        );

        return settled;
      }).pipe(Effect.withSpan("SendMessage.settleStranded"));

      return SendMessage.of({ run, settleStranded });
    })
  );
}
