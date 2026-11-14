import { Context, Effect, Layer, Metric, Option } from "effect";
import type { DateTime } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

import { CreditProblems } from "./ports/credit-problems.ts";
import type { CreditProblem } from "./ports/credit-problems.ts";
import { creditProblemsCount } from "./record-subscription.ts";

/** A refund Stripe reported failed, from its `refund.failed` event. */
export interface FailedRefund {
  readonly amount: number;
  readonly currency: string;
  /** Stripe's `failure_reason`. */
  readonly failureReason: Option.Option<string>;
  readonly occurredAt: DateTime.Utc;
  readonly refundId: string;
}

/**
 * Money Peal owes back and Stripe did not give, for staff: a refund
 * Stripe reported failed after it was made (`refund.failed`, which comes
 * days later, when the card or the bank sent it back) is kept once and
 * counted for the alert, so someone pays the customer another way; and
 * the latest of them, with the credits Stripe refused for good, for the
 * console.
 */
export class CreditProblemDesk extends Context.Service<
  CreditProblemDesk,
  {
    readonly refundFailed: (
      failure: FailedRefund
    ) => Effect.Effect<void, DatabaseError>;
    readonly latest: (
      limit: number
    ) => Effect.Effect<readonly CreditProblem[], DatabaseError>;
  }
>()("peal-server/billing/application/CreditProblemDesk") {
  static readonly layer = Layer.effect(
    CreditProblemDesk,
    Effect.gen(function* CreditProblemDeskLive() {
      const problems = yield* CreditProblems;

      const refundFailed = Effect.fn("CreditProblemDesk.refundFailed")(
        function* refundFailed(failure: FailedRefund) {
          const fresh = yield* problems.record({
            amount: failure.amount,
            code: failure.failureReason,
            currency: failure.currency,
            key: `refund:${failure.refundId}`,
            kind: "refundFailed",
            occurredAt: failure.occurredAt,
            reason: Option.none(),
            refundId: Option.some(failure.refundId),
            stripeSubscriptionId: Option.none(),
            workspaceId: Option.none(),
          });

          if (fresh) {
            yield* Metric.update(creditProblemsCount, 1);
            yield* Effect.logError(
              "Stripe reported a refund failed: kept for staff, who pay it another way"
            ).pipe(Effect.annotateLogs({ refundId: failure.refundId }));
          }
        }
      );

      return CreditProblemDesk.of({
        latest: (limit) => problems.latest(limit),
        refundFailed,
      });
    })
  );
}
