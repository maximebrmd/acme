import {
  Context,
  DateTime,
  Effect,
  Layer,
  Metric,
  Option,
  Result,
} from "effect";

import type { FollowUpId } from "#publishing/domain/follow-up-id.ts";
import {
  beginFollowUpCall,
  settleFollowUp,
  wasAttempted,
} from "#publishing/domain/follow-up.ts";
import type { FollowUpCallOutcome } from "#publishing/domain/follow-up.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";

import { FollowUpPublisher } from "./follow-up-publisher.ts";
import { FollowUpStore } from "./follow-up-store.ts";

/** Follow-ups whose call ended, by how. */
export const followUpsSent = Metric.counter("peal.publishing.follow_ups.sent", {
  description:
    "Follow-ups of rules at a threshold whose call ended, by outcome",
  incremental: true,
});

/**
 * How a run of the job left its follow-up: `settled`, or `superseded`
 * when there was nothing to send (it ended, or went with its workspace).
 */
export type FollowUpSendResult = "settled" | "superseded";

/**
 * Carries out one follow-up, for the job its trigger started, as engagement
 * sends a reply: the row is the journal. A run records that its call sets
 * out and commits before it calls; a run that finds the call set out does
 * not send, it asks the platform (`FollowUpPublisher.resume`), and leaves
 * the follow-up `unconfirmed` when the platform cannot say. It is never
 * sent twice.
 */
export class SendFollowUp extends Context.Service<
  SendFollowUp,
  {
    readonly run: (
      followUpId: FollowUpId
    ) => Effect.Effect<FollowUpSendResult, DatabaseError>;
  }
>()("peal-server/publishing/application/SendFollowUp") {
  static readonly layer = Layer.effect(
    SendFollowUp,
    Effect.gen(function* SendFollowUpLive() {
      const store = yield* FollowUpStore;
      const publisher = yield* FollowUpPublisher;
      const { transaction } = yield* TransactionRunner;

      // Saves how the call ended, unless the follow-up moved meanwhile.
      const settle = Effect.fn("SendFollowUp.settle")(function* settle(
        followUpId: FollowUpId,
        outcome: FollowUpCallOutcome
      ) {
        const now = yield* DateTime.now;
        const found = yield* store.followUp(followUpId);

        if (Option.isNone(found)) {
          return "superseded" as const;
        }

        const settled = settleFollowUp(found.value, outcome, now);

        if (Result.isFailure(settled)) {
          return "superseded" as const;
        }

        return (yield* store.advance(settled.success, found.value))
          ? ("settled" as const)
          : ("superseded" as const);
      });

      const outcomeOf = (
        call: Effect.Effect<
          Effect.Success<ReturnType<typeof publisher.send>>,
          Effect.Error<ReturnType<typeof publisher.send>>
        >
      ) =>
        call.pipe(
          Effect.match({
            onFailure: (failure): FollowUpCallOutcome => ({
              _tag: "refused",
              failure,
            }),
            onSuccess: (result): FollowUpCallOutcome => ({
              _tag: "answered",
              result,
            }),
          })
        );

      const run = Effect.fn("SendFollowUp.run")(function* run(
        followUpId: FollowUpId
      ) {
        const found = yield* store.followUp(followUpId);

        if (Option.isNone(found) || found.value.status._tag !== "sending") {
          return "superseded" as const;
        }

        const followUp = found.value;
        const request = { channelId: followUp.channelId, followUpId };

        if (wasAttempted(followUp)) {
          const outcome = yield* outcomeOf(publisher.resume(request));

          return yield* transaction(settle(followUpId, outcome));
        }

        const begun = beginFollowUpCall(followUp, yield* DateTime.now);

        if (Result.isFailure(begun)) {
          return "superseded" as const;
        }

        // Committed before the call: from here on, it may be out.
        if (!(yield* store.advance(begun.success, followUp))) {
          return "superseded" as const;
        }

        const outcome = yield* outcomeOf(publisher.send(request));
        const result = yield* transaction(settle(followUpId, outcome));

        if (result === "settled") {
          yield* Metric.update(
            Metric.withAttributes(followUpsSent, {
              outcome:
                outcome._tag === "refused" ? "refused" : outcome.result._tag,
            }),
            1
          );
        }

        return result;
      });

      return SendFollowUp.of({ run });
    })
  );
}
