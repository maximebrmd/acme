// What recording a subscription asks of Stripe: a trial set to end with its
// trial, a second trial ended, and the trial a paid plan replaces ended.
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
});
