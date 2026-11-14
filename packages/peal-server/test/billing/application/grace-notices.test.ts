// While the billing grace runs, the billing managers of a billing account
// on the free tier that holds more accounts than it includes are told
// once, on its billing workspace; after the grace's day, nobody is.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";

import { BillingAccountStore } from "#billing/application/ports/billing-account-store.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { BillingNotices } from "#billing/application/ports/billing-notices.ts";
import { ContractReferences } from "#billing/application/ports/contract-references.ts";
import { PlanRetirements } from "#billing/application/ports/plan-retirements.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { SendBillingReminders } from "#billing/application/send-billing-reminders.ts";
import type { BillingNotice } from "#billing/domain/billing-notice.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { aloneAccountOf, everyWorkspaceOn } from "#test/billing/support.ts";

const crowded = WorkspaceIdSchema.make("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d");

const within = WorkspaceIdSchema.make("2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e");

const until = DateTime.makeUnsafe("2027-01-31T00:00:00Z");

// Connected since the grace started: its third account is no grace's.
const grown = WorkspaceIdSchema.make("3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7f");

const accountsHeld = new Map<WorkspaceId, number>([
  [crowded, 3],
  [within, 2],
  [grown, 3],
]);

// What each had connected before the grace started.
const heldBefore = new Map<WorkspaceId, number>([
  [crowded, 3],
  [within, 2],
  [grown, 2],
]);

const remindersOn = (
  graceUntil: Option.Option<DateTime.Utc>,
  told: Ref.Ref<
    readonly { readonly key: string; readonly notice: BillingNotice }[]
  >
) =>
  SendBillingReminders.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(
          BillingMode,
          BillingMode.of({ enabled: true, graceSince: graceUntil, graceUntil })
        ),
        Layer.mock(Subscriptions, { remindable: () => Effect.succeed([]) }),
        Layer.mock(BillingAccountStore, {
          page: (after) =>
            Effect.succeed(
              Option.isNone(after)
                ? [
                    aloneAccountOf(crowded),
                    aloneAccountOf(within),
                    aloneAccountOf(grown),
                  ]
                : []
            ),
        }),
        Layer.succeed(
          BillingNotices,
          BillingNotices.of({
            tell: ({ key, notice }) =>
              Ref.update(told, (all) => [...all, { key, notice }]),
          })
        ),
        Layer.mock(ContractReferences, {}),
        Layer.mock(PlanRetirements, { untold: Effect.succeed([]) }),
        Layer.mock(StripeContracts, {}),
        Layer.mock(WorkspaceUsage, {
          heldIn: (ids, before) =>
            Effect.succeed(
              new Map(
                ids.map((id) => [
                  id,
                  {
                    channels:
                      (before === undefined ? accountsHeld : heldBefore).get(
                        id
                      ) ?? 0,
                    members: 1,
                  },
                ])
              )
            ),
        })
      )
    ),
    // The entitlements alone: the grace is the one above.
    Layer.provide(everyWorkspaceOn("free"))
  );

const runWith = (graceUntil: Option.Option<DateTime.Utc>) =>
  Effect.gen(function* withGrace() {
    const told = yield* Ref.make<
      readonly { readonly key: string; readonly notice: BillingNotice }[]
    >([]);

    const count = yield* SendBillingReminders.use(
      (reminders) => reminders.run
    ).pipe(Effect.provide(remindersOn(graceUntil, told)));

    return { count, told: yield* Ref.get(told) };
  });

describe("the billing grace's notices", () => {
  // The tests' clock starts in 1970.
  it.effect(
    "ask a billing account over its free accounts for a payment method",
    () =>
      Effect.gen(function* during() {
        const { count, told } = yield* runWith(Option.some(until));

        // No reminder was due: the grace's notices are not reminders. The
        // account whose third came since the grace started is not told.
        assert.strictEqual(count, 0);
        assert.deepStrictEqual(told, [
          {
            key: `billing:${crowded}:payment-method-needed:${until.epochMilliseconds}`,
            notice: {
              _tag: "PaymentMethodNeeded",
              accounts: 3,
              allowed: 2,
              graceUntil: until,
            },
          },
        ]);
      })
  );

  it.effect("tell nobody once the grace's day came, or without one", () =>
    Effect.gen(function* after() {
      const past = yield* runWith(
        Option.some(DateTime.makeUnsafe("1969-12-31T00:00:00Z"))
      );

      const none = yield* runWith(Option.none());

      assert.strictEqual(past.count + none.count, 0);
      assert.lengthOf([...past.told, ...none.told], 0);
    })
  );
});
