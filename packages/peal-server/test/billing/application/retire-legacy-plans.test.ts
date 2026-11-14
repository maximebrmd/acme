// Retiring the legacy plans: a dry run lists and changes nothing; applying
// sets each subscription to end on its day at Stripe, once, and the hourly
// reminders tell its billing managers once; a trial and a plan a
// cancellation ends already are left alone.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { TestClock } from "effect/testing";

import { BillingAccountStore } from "#billing/application/ports/billing-account-store.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { BillingNotices } from "#billing/application/ports/billing-notices.ts";
import { ContractReferences } from "#billing/application/ports/contract-references.ts";
import { PlanRetirements } from "#billing/application/ports/plan-retirements.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { RetireLegacyPlans } from "#billing/application/retire-legacy-plans.ts";
import { SendBillingReminders } from "#billing/application/send-billing-reminders.ts";
import type { BillingNotice } from "#billing/domain/billing-notice.ts";
import { Subscription } from "#billing/domain/subscription.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { everyWorkspaceOn } from "#test/billing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "4d5e6f7a-8b9c-4d0e-8f1a-2b3c4d5e6f7a"
);

const at = (iso: string) => DateTime.makeUnsafe(iso);

const now = at("2026-11-14T10:00:00Z");

const legacy = (
  id: string,
  fields: Partial<ConstructorParameters<typeof Subscription>[0]> = {}
) =>
  new Subscription({
    cancelAt: Option.none(),
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Option.some(at("2026-12-01T00:00:00Z")),
    currentPeriodStart: Option.some(at("2026-11-01T00:00:00Z")),
    interval: "month",
    paidInvoiceAt: Option.none(),
    plan: "starter",
    startedAt: Option.some(at("2026-01-01T00:00:00Z")),
    status: "active",
    stripeCustomerId: `cus_synthetic_${id}`,
    stripeSubscriptionId: id,
    trialEnd: Option.none(),
    workspaceId,
    ...fields,
  });

// The subscriptions, each with its day once retired and when it was told.
interface Row {
  subscription: Subscription;
  retiresAt: Option.Option<DateTime.Utc>;
  toldAt: Option.Option<DateTime.Utc>;
}

const world = () => {
  const rows: Row[] = [
    // Its period ends in 17 days: it renews once, to January 1st.
    { subscription: legacy("sub_synthetic_monthly") },
    // A year that ends on March 1st, well after the notice.
    {
      subscription: legacy("sub_synthetic_yearly", {
        currentPeriodEnd: Option.some(at("2027-03-01T00:00:00Z")),
        interval: "year",
        plan: "pro",
      }),
    },
    // Cancelled by its subscriber: it ends anyway.
    {
      subscription: legacy("sub_synthetic_cancelled", {
        cancelAtPeriodEnd: true,
      }),
    },
    // A trial, set to cancel at its end.
    {
      subscription: legacy("sub_synthetic_trial", {
        status: "trialing",
        trialEnd: Option.some(at("2026-11-20T00:00:00Z")),
      }),
    },
  ].map((row) => ({ ...row, retiresAt: Option.none(), toldAt: Option.none() }));

  const asked: string[] = [];
  const told: string[] = [];

  return { asked, rows, told };
};

type World = ReturnType<typeof world>;

const Ports = (state: World, enabled = true) =>
  Layer.mergeAll(
    Layer.succeed(
      BillingMode,
      BillingMode.of({
        enabled,
        graceSince: Option.none(),
        graceUntil: Option.none(),
      })
    ),
    Layer.succeed(
      PlanRetirements,
      PlanRetirements.of({
        legacy: Effect.sync(() => state.rows.map((row) => ({ ...row }))),
        retire: (id, day) =>
          Effect.sync(() => {
            const row = state.rows.find(
              ({ subscription }) => subscription.stripeSubscriptionId === id
            );

            if (row !== undefined && Option.isNone(row.retiresAt)) {
              row.retiresAt = Option.some(day);
            }

            return Option.getOrElse(row?.retiresAt ?? Option.none(), () => day);
          }),
        told: (id, when) =>
          Effect.sync(() => {
            const row = state.rows.find(
              ({ subscription }) => subscription.stripeSubscriptionId === id
            );

            if (row !== undefined) {
              row.toldAt = Option.some(when);
            }
          }),
        untold: Effect.sync(() =>
          state.rows
            .filter(
              ({ retiresAt, toldAt }) =>
                Option.isSome(retiresAt) && Option.isNone(toldAt)
            )
            .map((row) => ({ ...row }))
        ),
      })
    ),
    Layer.mock(StripeContracts, {
      cancelAt: (_workspace, id, day, key) =>
        Effect.sync(() => {
          state.asked.push(`cancelAt ${id} ${DateTime.formatIso(day)} ${key}`);
        }),
      cancelAtPeriodEnd: (_workspace, id, key) =>
        Effect.sync(() => {
          state.asked.push(`cancelAtPeriodEnd ${id} ${key}`);
        }),
    })
  );

const retired = (state: World, apply: boolean, enabled = true) =>
  RetireLegacyPlans.use((retire) => retire.run({ apply })).pipe(
    Effect.provide(
      RetireLegacyPlans.layer.pipe(Layer.provide(Ports(state, enabled)))
    )
  );

const remindersOf = (state: World) =>
  SendBillingReminders.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        Ports(state),
        Layer.mock(Subscriptions, { remindable: () => Effect.succeed([]) }),
        Layer.mock(BillingAccountStore, {}),
        Layer.succeed(
          BillingNotices,
          BillingNotices.of({
            tell: ({ key, notice }: { key: string; notice: BillingNotice }) =>
              Effect.sync(() => {
                state.told.push(
                  `${key} ${notice._tag} ${
                    notice._tag === "PlansRetiring"
                      ? `${notice.plan} ${DateTime.formatIso(notice.endsAt)}`
                      : ""
                  }`
                );
              }),
          })
        ),
        Layer.mock(ContractReferences, {}),
        Layer.mock(WorkspaceUsage, {})
      )
    ),
    Layer.provide(everyWorkspaceOn("starter"))
  );

describe("retiring the legacy plans", () => {
  it.effect("lists what it would do on a dry run, and changes nothing", () =>
    Effect.gen(function* dryRun() {
      const state = world();

      yield* TestClock.setTime(DateTime.toEpochMillis(now));

      const report = yield* retired(state, false);

      assert.isFalse(report.applied);
      assert.deepStrictEqual(
        report.retirements.map((retirement) => [
          retirement._tag,
          retirement.subscription.stripeSubscriptionId,
          retirement._tag === "retire"
            ? DateTime.formatIso(retirement.endsAt)
            : "",
        ]),
        [
          ["retire", "sub_synthetic_monthly", "2027-01-01T00:00:00.000Z"],
          ["retire", "sub_synthetic_yearly", "2027-03-01T00:00:00.000Z"],
          ["ending", "sub_synthetic_cancelled", ""],
          ["trial", "sub_synthetic_trial", ""],
        ]
      );
      assert.deepStrictEqual(state.asked, []);
      assert.isTrue(
        state.rows.every(({ retiresAt }) => Option.isNone(retiresAt))
      );
    })
  );

  it.effect(
    "sets each to end on its day once, then tells its billing managers once",
    () =>
      Effect.gen(function* applied() {
        const state = world();

        yield* TestClock.setTime(DateTime.toEpochMillis(now));

        yield* retired(state, true);

        assert.deepStrictEqual(state.asked, [
          "cancelAt sub_synthetic_monthly 2027-01-01T00:00:00.000Z retirement",
          "cancelAtPeriodEnd sub_synthetic_yearly retirement",
        ]);

        // Stripe's events record the ends; a second run asks nothing more.
        for (const row of state.rows.slice(0, 2)) {
          const { currentPeriodEnd, interval, plan, stripeSubscriptionId } =
            row.subscription;

          row.subscription = legacy(stripeSubscriptionId, {
            cancelAt: row.retiresAt,
            currentPeriodEnd,
            interval,
            plan,
          });
        }

        state.asked.length = 0;

        const again = yield* retired(state, true);

        assert.deepStrictEqual(state.asked, []);
        assert.deepStrictEqual(
          again.retirements.slice(0, 2).map(({ _tag }) => _tag),
          ["retired", "retired"]
        );

        // The hourly reminders tell each once.
        yield* SendBillingReminders.use((reminders) => reminders.run).pipe(
          Effect.provide(remindersOf(state))
        );
        yield* SendBillingReminders.use((reminders) => reminders.run).pipe(
          Effect.provide(remindersOf(state))
        );

        assert.deepStrictEqual(state.told, [
          "plans-retiring:sub_synthetic_monthly PlansRetiring starter 2027-01-01T00:00:00.000Z",
          "plans-retiring:sub_synthetic_yearly PlansRetiring pro 2027-03-01T00:00:00.000Z",
        ]);
      })
  );

  it.effect(
    "asks Stripe again for a day kept whose call did not go through",
    () =>
      Effect.gen(function* resumed() {
        const state = world();

        yield* TestClock.setTime(DateTime.toEpochMillis(now));

        const [first] = state.rows;

        if (first !== undefined) {
          first.retiresAt = Option.some(at("2027-01-01T00:00:00Z"));
        }

        yield* retired(state, true);

        assert.include(
          state.asked,
          "cancelAt sub_synthetic_monthly 2027-01-01T00:00:00.000Z retirement"
        );
      })
  );

  it.effect("applies nothing on a server that does not bill", () =>
    Effect.gen(function* unbilled() {
      const state = world();
      const refused = yield* Effect.flip(retired(state, true, false));

      assert.strictEqual(refused._tag, "BillingOff");
      assert.deepStrictEqual(state.asked, []);
    })
  );
});
