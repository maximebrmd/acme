import { Context, DateTime, Effect, Layer, Option } from "effect";

import { CreditProblemNotFound } from "#billing/domain/credit-problem-not-found.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";

import { CreditProblemReview } from "./ports/credit-problem-review.ts";
import { CreditProblems } from "./ports/credit-problems.ts";
import type { CreditProblem } from "./ports/credit-problems.ts";

/**
 * Staff marking a credit Stripe refused, or a refund it reported failed,
 * as settled by hand: recorded in the audit log first
 * (`settleCreditProblem`, its Stripe ids and the reason), then marked
 * (`settled_at`, once). The console then shows it settled.
 */
export class SettleCreditProblem extends Context.Service<
  SettleCreditProblem,
  {
    readonly settle: (request: {
      readonly key: string;
      readonly reason: string;
      readonly staffId: UserId;
    }) => Effect.Effect<CreditProblem, CreditProblemNotFound | DatabaseError>;
  }
>()("peal-server/billing/application/SettleCreditProblem") {
  static readonly layer = Layer.effect(
    SettleCreditProblem,
    Effect.gen(function* SettleCreditProblemLive() {
      const problems = yield* CreditProblems;
      const review = yield* CreditProblemReview;

      const settle = Effect.fn("SettleCreditProblem.settle")(function* settle({
        key,
        reason,
        staffId,
      }: {
        readonly key: string;
        readonly reason: string;
        readonly staffId: UserId;
      }) {
        const found = yield* problems.find(key);

        if (Option.isNone(found)) {
          return yield* new CreditProblemNotFound({ key });
        }

        const now = yield* DateTime.now;

        yield* review.settled({
          at: now,
          reason,
          refundId: found.value.refundId,
          staffId,
          stripeSubscriptionId: found.value.stripeSubscriptionId,
          workspaceId: found.value.workspaceId,
        });
        yield* problems.settle(key, now);

        const settled: CreditProblem = {
          ...found.value,
          settledAt: Option.orElse(found.value.settledAt, () =>
            Option.some(now)
          ),
        };

        return settled;
      });

      return SettleCreditProblem.of({ settle });
    })
  );
}
