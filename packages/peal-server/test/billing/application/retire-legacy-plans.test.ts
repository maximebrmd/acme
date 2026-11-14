// Retiring the legacy plans: a dry run lists and changes nothing; applying
// sets each subscription to end on its day at Stripe first, keeps the day
// only once Stripe took it, goes on past one Stripe refuses, and the hourly
// reminders tell its billing managers once, moving the day later first if
// the notice would give fewer than 30 days.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Metric, Option } from "effect";
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
import {
  retirementNoticesBehind,
  SendBillingReminders,
} from "#billing/application/send-billing-reminders.ts";
import { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import type { BillingNotice } from "#billing/domain/billing-notice.ts";
import { Subscription } from "#billing/domain/subscription.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { everyWorkspaceOn } from "#test/billing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "4d5e6f7a-8b9c-4d0e-8f1a-2b3c4d5e6f7a"
);

const at = (iso: string) => DateTime.makeUnsafe(iso);

const now = at("2026-11-14T10:00:00Z");

// A notice told a day after now: 30 days later, at midnight.
const day = "2026-12-16T00:00:00.000Z";

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
  retiredAt: Option.Option<DateTime.Utc>;
  toldAt: Option.Option<DateTime.Utc>;
}

const world = () => {
  const rows: Row[] = [
    // Its period ends before the day: it renews into a period charged up
    // to the day.
    { subscription: legacy("sub_synthetic_monthly") },
    // Stripe refuses any change to it.
    { subscription: legacy("sub_synthetic_refused") },
    // A year that ends after the day: it ends within the period paid for.
    {
      subscription: legacy("sub_synthetic_yearly", {
        currentPeriodEnd: Option.some(at("2027-03-01T00:00:00Z")),
        interval: "year",
        plan: "pro",
      }),
    },
    // Cancelled by its subscriber, to end before the day.
    {
      subscription: legacy("sub_synthetic_cancelled", {
        cancelAtPeriodEnd: true,
      }),
    },
    // Cancelled for a day after the retirement's: brought forward.
    {
      subscription: legacy("sub_synthetic_later", {
        cancelAt: Option.some(at("2027-02-01T00:00:00Z")),
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
  ].map((row) => ({
    ...row,
    retiredAt: Option.none(),
    retiresAt: Option.none(),
    toldAt: Option.none(),
  }));

  const asked: string[] = [];
  const told: string[] = [];

  return { asked, rows, told };
};

type World = ReturnType<typeof world>;

const rowOf = (state: World, id: string) =>
  state.rows.find(
    ({ subscription }) => subscription.stripeSubscriptionId === id
  );

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
        retire: (id, retiresAt, when) =>
          Effect.sync(() => {
            const row = rowOf(state, id);

            if (row !== undefined) {
              row.retiresAt = Option.some(retiresAt);
              row.retiredAt = Option.orElse(row.retiredAt, () =>
                Option.some(when)
              );
            }
          }),
        retiresAt: (id) =>
          Effect.sync(() => rowOf(state, id)?.retiresAt ?? Option.none()),
        told: (id, when) =>
          Effect.sync(() => {
            const row = rowOf(state, id);

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
      retireAt: (workspace, id, when, prorate) =>
        id === "sub_synthetic_refused"
          ? Effect.fail(
              new StripeUnreachable({ permanent: true, workspaceId: workspace })
            )
          : Effect.sync(() => {
              state.asked.push(
                `retireAt ${id} ${DateTime.formatIso(when)} ${prorate ? "prorated" : "unprorated"}`
              );
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

const remind = (state: World) =>
  SendBillingReminders.use((reminders) => reminders.run).pipe(
    Effect.provide(remindersOf(state))
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
          "endsAt" in retirement ? DateTime.formatIso(retirement.endsAt) : "",
        ]),
        [
          ["retire", "sub_synthetic_monthly", day],
          ["retire", "sub_synthetic_refused", day],
          ["retire", "sub_synthetic_yearly", day],
          ["ending", "sub_synthetic_cancelled", "2026-12-01T00:00:00.000Z"],
          ["retire", "sub_synthetic_later", day],
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
    "sets each at Stripe first, keeps the day once Stripe took it, goes on past a refusal, and tells once",
    () =>
      Effect.gen(function* applied() {
        const state = world();

        yield* TestClock.setTime(DateTime.toEpochMillis(now));

        const report = yield* retired(state, true);

        assert.deepStrictEqual(state.asked, [
          `retireAt sub_synthetic_monthly ${day} prorated`,
          `retireAt sub_synthetic_yearly ${day} unprorated`,
          `retireAt sub_synthetic_later ${day} prorated`,
        ]);
        assert.deepStrictEqual(
          report.retirements
            .filter(({ _tag }) => _tag === "failed")
            .map(({ subscription }) => subscription.stripeSubscriptionId),
          ["sub_synthetic_refused"]
        );
        // Nothing kept for the one Stripe refused: nobody is told of it.
        assert.isTrue(
          Option.isNone(
            rowOf(state, "sub_synthetic_refused")?.retiresAt ?? Option.none()
          )
        );

        // A run again asks only the one that failed.
        state.asked.length = 0;
        yield* retired(state, true);
        assert.deepStrictEqual(state.asked, []);

        // The hourly reminders tell each once.
        yield* remind(state);
        yield* remind(state);

        assert.deepStrictEqual(state.told, [
          `plans-retiring:sub_synthetic_monthly PlansRetiring starter ${day}`,
          `plans-retiring:sub_synthetic_yearly PlansRetiring pro ${day}`,
          `plans-retiring:sub_synthetic_later PlansRetiring starter ${day}`,
        ]);
      })
  );

  it.effect(
    "moves the day later, at Stripe first, when the notice goes out too late to give 30 days, and says the notices fall behind",
    () =>
      Effect.gen(function* late() {
        const state = world();

        yield* TestClock.setTime(DateTime.toEpochMillis(now));
        yield* retired(state, true);

        // The reminders did not run for three days.
        yield* TestClock.setTime(
          DateTime.toEpochMillis(at("2026-11-17T10:00:00Z"))
        );
        state.asked.length = 0;

        yield* remind(state);

        const later = "2026-12-18T00:00:00.000Z";

        assert.include(
          state.asked,
          `retireAt sub_synthetic_monthly ${later} prorated`
        );
        assert.include(
          state.told,
          `plans-retiring:sub_synthetic_monthly PlansRetiring starter ${later}`
        );
        assert.strictEqual(
          (yield* Metric.value(retirementNoticesBehind)).value,
          3 * 24 * 3600
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
