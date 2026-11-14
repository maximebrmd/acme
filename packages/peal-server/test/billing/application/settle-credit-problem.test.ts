// Staff marking a credit or a refund Stripe did not give as settled: the
// audit log first, then the mark, once; a key that names nothing is
// refused and records nothing.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";

import { CreditProblemReview } from "#billing/application/ports/credit-problem-review.ts";
import { CreditProblems } from "#billing/application/ports/credit-problems.ts";
import type { CreditProblem } from "#billing/application/ports/credit-problems.ts";
import { SettleCreditProblem } from "#billing/application/settle-credit-problem.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";

const staffId = UserIdSchema.make("00000000-0000-4000-8000-0000000000d1");

const owed: CreditProblem = {
  amount: 950,
  code: Option.some("credit_note_amount_too_large"),
  currency: "eur",
  key: "credit:sub_synthetic:in_synthetic",
  kind: "creditRefused",
  occurredAt: DateTime.makeUnsafe("2026-11-14T10:00:00Z"),
  reason: Option.some("movedToRateCard"),
  refundId: Option.none(),
  settledAt: Option.none(),
  stripeSubscriptionId: Option.some("sub_synthetic"),
  workspaceId: Option.none(),
};

const settleWith = (steps: string[]) =>
  SettleCreditProblem.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.mock(CreditProblems, {
          find: (key) =>
            Effect.succeed(
              key === owed.key ? Option.some(owed) : Option.none()
            ),
          settle: (key) =>
            Effect.sync(() => {
              steps.push(`settle ${key}`);
            }),
        }),
        Layer.succeed(
          CreditProblemReview,
          CreditProblemReview.of({
            settled: ({ reason, stripeSubscriptionId }) =>
              Effect.sync(() => {
                steps.push(
                  `audit ${Option.getOrElse(stripeSubscriptionId, () => "")} ${reason}`
                );
              }),
          })
        )
      )
    )
  );

describe("settling a credit problem", () => {
  it.effect("records it in the audit log first, then marks it settled", () => {
    const steps: string[] = [];

    return Effect.gen(function* settled() {
      const settle = yield* SettleCreditProblem;

      const done = yield* settle.settle({
        key: owed.key,
        reason: "Refunded by bank transfer",
        staffId,
      });

      assert.isTrue(Option.isSome(done.settledAt));
      assert.deepStrictEqual(steps, [
        "audit sub_synthetic Refunded by bank transfer",
        `settle ${owed.key}`,
      ]);
    }).pipe(Effect.provide(settleWith(steps)));
  });

  it.effect("refuses a key that names nothing, recording nothing", () => {
    const steps: string[] = [];

    return Effect.gen(function* unknown() {
      const settle = yield* SettleCreditProblem;

      const refused = yield* Effect.flip(
        settle.settle({ key: "credit:unknown", reason: "Synthetic", staffId })
      );

      assert.strictEqual(refused._tag, "CreditProblemNotFound");
      assert.deepStrictEqual(steps, []);
    }).pipe(Effect.provide(settleWith(steps)));
  });
});
