// Whose plan each workspace is on: on a server that does not bill, only a
// partner's pool says, and no billing account is read or made.
import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { AccountPlanHoldersLive } from "#billing/infrastructure/account-plan-holders.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";
import { PartnerIdSchema } from "#workspace/domain/partner-id.ts";

const home = WorkspaceIdSchema.make("5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60");
const customer = WorkspaceIdSchema.make("6c1d7f75-6e1f-4b8f-8b63-4f2d3e5f6071");
const alone = WorkspaceIdSchema.make("7d2e8f86-7f2f-4c9f-9c74-5f3e4f6f7182");

const UnbilledTest = AccountPlanHoldersLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      Layer.mock(PartnerOwnership, {
        partnersIn: (ids) =>
          Effect.succeed(
            new Map(
              ids
                .filter((id) => id === customer)
                .map((id) => [
                  id,
                  {
                    home,
                    partnerId: PartnerIdSchema.make(
                      "0190f3a0-0000-7000-8000-0000000000aa"
                    ),
                  },
                ])
            )
          ),
      }),
      // Any read of an account dies.
      Layer.mock(BillingAccounts, {}),
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled: false,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      )
    )
  )
);

describe("plan holders on a server that does not bill", () => {
  it.effect("answer the partner rule alone, reading no billing account", () =>
    Effect.gen(function* holders() {
      const plans = yield* PlanHolders;

      assert.strictEqual(yield* plans.holderOf(customer), home);
      assert.strictEqual(yield* plans.holderOf(alone), alone);
      assert.deepStrictEqual(
        yield* plans.holdersOf([customer, alone]),
        new Map([
          [customer, home],
          [alone, alone],
        ])
      );
    }).pipe(Effect.provide(UnbilledTest))
  );
});
