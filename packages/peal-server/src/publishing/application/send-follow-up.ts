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
import type {
  FollowUp,
  FollowUpCallOutcome,
} from "#publishing/domain/follow-up.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";

import { ApprovalGate } from "./approval-gate.ts";
import { actsNow } from "./follow-up-acts-now.ts";
import { FollowUpPublisher } from "./follow-up-publisher.ts";
import { FollowUpStore } from "./follow-up-store.ts";
import { RecyclingActors } from "./recycling-actors.ts";

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
      followUpId: FollowUpId,
      attempt: number
    ) => Effect.Effect<FollowUpSendResult, DatabaseError>;
  }
>()("peal-server/publishing/application/SendFollowUp") {
  static readonly layer = Layer.effect(
    SendFollowUp,
    Effect.gen(function* SendFollowUpLive() {
      const store = yield* FollowUpStore;
      const publisher = yield* FollowUpPublisher;
      const actors = yield* RecyclingActors;
      const gate = yield* ApprovalGate;
      const { transaction } = yield* TransactionRunner;

      // Saves how the call ended, unless the follow-up moved meanwhile, to
      // a later attempt included: that attempt's job settles it.
      const settle = Effect.fn("SendFollowUp.settle")(function* settle(
        followUpId: FollowUpId,
        attempt: number,
        outcome: FollowUpCallOutcome
      ) {
        const now = yield* DateTime.now;
        const found = yield* store.followUp(followUpId);

        if (Option.isNone(found) || found.value.attempt !== attempt) {
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

      // Whether what the rule sends may still go out as its starter, just
      // before the call waits its turn at the gate, which judges it again
      // as it reads the text: a rule paused, stopped or changed since the
      // run triggered it, or a starter the policy holds now. A rule gone
      // is the publisher's to refuse.
      const stillMayAct = Effect.fn("SendFollowUp.stillMayAct")(
        function* stillMayAct(followUp: FollowUp) {
          const rule = yield* store.rule(followUp.workspaceId, followUp.ruleId);

          return Option.isNone(rule)
            ? true
            : yield* actsNow(rule.value, { holds: gate.holds, of: actors.of });
        }
      );

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
        followUpId: FollowUpId,
        attempt: number
      ) {
        const found = yield* store.followUp(followUpId);

        // Another attempt's job, or one that ended: nothing to send.
        if (
          Option.isNone(found) ||
          found.value.status._tag !== "sending" ||
          found.value.attempt !== attempt
        ) {
          return "superseded" as const;
        }

        const followUp = found.value;
        const request = { channelId: followUp.channelId, followUpId };

        if (wasAttempted(followUp)) {
          const outcome = yield* outcomeOf(publisher.resume(request));

          return yield* transaction(settle(followUpId, attempt, outcome));
        }

        // Put off, as nothing went out: armed again until its window ends,
        // for the run to judge again.
        if (!(yield* stillMayAct(followUp))) {
          return yield* transaction(
            settle(followUpId, attempt, {
              _tag: "refused",
              failure: new PlatformUnavailable(),
            })
          );
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
        const result = yield* transaction(settle(followUpId, attempt, outcome));

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
