import { assert, layer } from "@effect/vitest";
import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import { Checkouts } from "#billing/application/ports/checkouts.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { Trials } from "#billing/application/ports/trials.ts";
import { RecordSubscription } from "#billing/application/record-subscription.ts";
import type { SubscriptionEvent } from "#billing/application/record-subscription.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
// What recording a subscription asks of Stripe: a trial set to end with its
// trial, a second trial ended, and the trial a paid plan replaces ended.
import { AloneInAccountsTest } from "#test/billing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"
);

const userId = UserIdSchema.make("3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f");

const at = (iso: string) => DateTime.makeUnsafe(iso);

const trialEnd = at("2026-11-23T10:00:00Z");

// What a test reads: the subscriptions recorded, the trials Stripe reported
// and whether each was the account's first, and what was asked of Stripe.
class RecordLog extends Context.Service<
  RecordLog,
  {
    readonly held: Ref.Ref<readonly Subscription[]>;
    readonly stripe: Ref.Ref<readonly string[]>;
    readonly trials: Ref.Ref<readonly string[]>;
  }
>()("peal-server/test/billing/RecordLog") {}

const LogLive = Layer.effect(
  RecordLog,
  Effect.all({
    held: Ref.make<readonly Subscription[]>([]),
    stripe: Ref.make<readonly string[]>([]),
    trials: Ref.make<readonly string[]>([]),
  })
);

const PortsInMemory = Layer.mergeAll(
  Layer.effect(
    Subscriptions,
    RecordLog.use(({ held }) =>
      Effect.succeed(
        Subscriptions.of({
          eraseWorkspace: () => Effect.void,
          forgetUser: () => Effect.void,
          ofWorkspace: () => Ref.get(held),
          ofWorkspaces: () => Effect.die("not read here"),
          record: (change) =>
            Ref.update(held, (all) => [
              ...all.filter(
                ({ stripeSubscriptionId }) =>
                  stripeSubscriptionId !==
                  change.subscription.stripeSubscriptionId
              ),
              change.subscription,
            ]).pipe(Effect.as("recorded" as const)),
          remindable: () => Ref.get(held),
        })
      )
    )
  ),
  // One trial per account: a second subscription's is refused.
  Layer.effect(
    Trials,
    RecordLog.use(({ trials }) =>
      Effect.succeed(
        Trials.of({
          forgetPseudonyms: () => Effect.succeed(0),
          record: (trial) =>
            Ref.modify(trials, (all) => {
              const first =
                all.length === 0 || all.includes(trial.stripeSubscriptionId);

              return [
                first,
                first
                  ? [...new Set([...all, trial.stripeSubscriptionId])]
                  : all,
              ];
            }),
          reserve: () => Effect.succeed(true),
          used: () => Ref.get(trials).pipe(Effect.map((all) => all.length > 0)),
          usedByPseudonym: () => Effect.succeed(false),
        })
      )
    )
  ),
  Layer.effect(
    StripeContracts,
    RecordLog.use(({ stripe }) => {
      const asked = (call: string) =>
        Ref.update(stripe, (all) => [...all, call]);

      return Effect.succeed(
        StripeContracts.of({
          cancelAt: () => Effect.void,
          cancelAtPeriodEnd: (_workspace, id) =>
            asked(`cancelAtPeriodEnd ${id}`),
          credit: (_workspace, id) => asked(`credit ${id}`),
          endAtTrialEnd: (_workspace, id, end) =>
            asked(`endAtTrialEnd ${id} ${DateTime.formatIso(end)}`),
          endAndInvoice: (_workspace, id, reason) =>
            asked(`endAndInvoice ${id} ${reason}`),
          endNow: (_workspace, id, reason) => asked(`endNow ${id} ${reason}`),
          isBusiness: () => Effect.succeed(false),
          paidInvoices: () => Effect.succeed([]),
          upcomingTotal: () => Effect.succeed(Option.none()),
        })
      );
    })
  ),
  Layer.succeed(
    TransactionRunner,
    TransactionRunner.of({ transaction: (effect) => effect })
  ),
  Layer.mock(Checkouts, { holdWorkspace: () => Effect.succeed(true) })
);

const RecordTest = RecordSubscription.layer.pipe(
  Layer.provide(AloneInAccountsTest),
  Layer.provideMerge(PortsInMemory),
  Layer.provideMerge(LogLive)
);

const reset = RecordLog.use((log) =>
  Effect.all([
    Ref.set(log.held, []),
    Ref.set(log.stripe, []),
    Ref.set(log.trials, []),
  ])
);

const askedOfStripe = RecordLog.use(({ stripe }) => Ref.get(stripe));

let eventCount = 0;

const event = (fields: Partial<SubscriptionEvent>): SubscriptionEvent => {
  eventCount += 1;

  return {
    cancelAt: Option.none(),
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Option.some(trialEnd),
    currentPeriodStart: Option.some(at("2026-11-09T10:00:00Z")),
    eventId: `evt_synthetic_${eventCount}`,
    interval: "month",
    occurredAt: at("2026-11-09T10:00:00Z"),
    plan: "pro",
    startedAt: Option.some(at("2026-11-09T10:00:00Z")),
    startedBy: Option.some(userId),
    status: "trialing",
    stripeCustomerId: "cus_synthetic",
    stripeSubscriptionId: "sub_synthetic_trial",
    trialEnd: Option.some(trialEnd),
    workspaceId,
    ...fields,
  };
};

const record = (fields: Partial<SubscriptionEvent>) =>
  RecordSubscription.use((subscriptions) =>
    subscriptions.record(event(fields))
  );

// A per-account subscription, active since `startedAt`.
const perAccount = (id: string, startedAt: string) =>
  record({
    plan: "payAsYouGo",
    startedAt: Option.some(at(startedAt)),
    startedBy: Option.none(),
    status: "active",
    stripeSubscriptionId: id,
    trialEnd: Option.none(),
  });

layer(RecordTest)("recording a subscription", (it) => {
  it.effect(
    "sets a trial to end, cancelled, with its trial, so a card added in the portal is never charged",
    () =>
      Effect.gen(function* trial() {
        yield* reset;
        yield* record({});

        assert.deepStrictEqual(yield* askedOfStripe, [
          `endAtTrialEnd sub_synthetic_trial ${DateTime.formatIso(trialEnd)}`,
        ]);

        // Once Stripe says so, nothing more is asked.
        yield* record({ cancelAt: Option.some(trialEnd) });

        assert.strictEqual((yield* askedOfStripe).length, 1);
      })
  );

  it.effect("ends a second trial of the same account", () =>
    Effect.gen(function* twice() {
      yield* reset;
      yield* record({ cancelAt: Option.some(trialEnd) });
      yield* record({
        cancelAt: Option.some(trialEnd),
        stripeSubscriptionId: "sub_synthetic_second",
      });

      assert.deepStrictEqual(yield* askedOfStripe, [
        "endNow sub_synthetic_second duplicateTrial",
      ]);
    })
  );

  it.effect(
    "ends the trial once the paid plan ordered during it is recorded",
    () =>
      Effect.gen(function* ordered() {
        yield* reset;
        yield* record({ cancelAt: Option.some(trialEnd) });

        // The checkout is still open: the trial runs.
        yield* record({
          startedBy: Option.none(),
          status: "incomplete",
          stripeSubscriptionId: "sub_synthetic_paid",
          trialEnd: Option.none(),
        });

        assert.deepStrictEqual(yield* askedOfStripe, []);

        yield* record({
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_paid",
          trialEnd: Option.none(),
        });

        assert.deepStrictEqual(yield* askedOfStripe, [
          "endNow sub_synthetic_trial orderedDuringTrial",
        ]);
      })
  );

  it.effect(
    "ends a trial at once, and a legacy plan at its period's end, once per-account pricing is recorded",
    () =>
      Effect.gen(function* moved() {
        yield* reset;
        yield* record({ cancelAt: Option.some(trialEnd) });
        yield* record({
          plan: "starter",
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_legacy",
          trialEnd: Option.none(),
        });
        yield* RecordLog.use(({ stripe }) => Ref.set(stripe, []));

        yield* record({
          plan: "payAsYouGo",
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_accounts",
          trialEnd: Option.none(),
        });

        assert.deepStrictEqual(yield* askedOfStripe, [
          "endNow sub_synthetic_trial orderedDuringTrial",
          "cancelAtPeriodEnd sub_synthetic_legacy",
        ]);

        // Recorded again, Stripe is asked again under the same keys.
        const entitlements = (yield* RecordLog.use(({ held }) =>
          Ref.get(held)
        )).map(({ plan, stripeSubscriptionId }) => [
          stripeSubscriptionId,
          plan,
        ]);

        assert.deepInclude(entitlements, [
          "sub_synthetic_accounts",
          "payAsYouGo",
        ]);
      })
  );

  it.effect(
    "ends at once, without a charge, a second per-account subscription of the account, keeping the older",
    () =>
      Effect.gen(function* duplicate() {
        yield* reset;
        yield* perAccount("sub_synthetic_first", "2026-11-09T10:00:00Z");
        yield* perAccount("sub_synthetic_second", "2026-11-09T10:05:00Z");

        assert.deepStrictEqual(yield* askedOfStripe, [
          "endNow sub_synthetic_second duplicateSubscription",
        ]);

        // The older one's event arriving last ends the newer one too.
        yield* reset;
        yield* perAccount("sub_synthetic_late", "2026-11-09T10:05:00Z");
        yield* perAccount("sub_synthetic_early", "2026-11-09T10:00:00Z");

        assert.deepStrictEqual(yield* askedOfStripe, [
          "endNow sub_synthetic_late duplicateSubscription",
        ]);
      })
  );

  it.effect(
    "keeps following a subscription whose price this server no longer lists, on the plan it recorded",
    () =>
      Effect.gen(function* repriced() {
        yield* reset;
        yield* record({
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_old",
          trialEnd: Option.none(),
        });

        // The prices changed since: Stripe's events about the subscribers
        // of the old ones name a price that is none of this server's now.
        const cancelled = yield* record({
          interval: null,
          plan: null,
          startedBy: Option.none(),
          status: "canceled",
          stripeSubscriptionId: "sub_synthetic_old",
          trialEnd: Option.none(),
        });

        assert.strictEqual(cancelled, "recorded");
        assert.deepStrictEqual(
          (yield* RecordLog.use(({ held }) => Ref.get(held))).map(
            ({ plan, status }) => [plan, status]
          ),
          [["pro", "canceled"]]
        );

        // One billing never recorded is none of its workspaces' plans.
        const unknown = yield* record({
          interval: null,
          plan: null,
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_by_hand",
          trialEnd: Option.none(),
        });

        assert.strictEqual(unknown, "ignored");
      })
  );
});
