import { assert, layer } from "@effect/vitest";
import { Context, DateTime, Effect, Layer, Metric, Option, Ref } from "effect";

import { AccountDays } from "#billing/application/account-days.ts";
import { Checkouts } from "#billing/application/ports/checkouts.ts";
import { CreditProblems } from "#billing/application/ports/credit-problems.ts";
import type { CreditProblem } from "#billing/application/ports/credit-problems.ts";
import { PlanRetirements } from "#billing/application/ports/plan-retirements.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import type { PaidInvoice } from "#billing/application/ports/stripe-contracts.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { Trials } from "#billing/application/ports/trials.ts";
import { UsageBilling } from "#billing/application/ports/usage-billing.ts";
import {
  creditProblemsCount,
  duplicateSubscriptions,
  RecordSubscription,
  thresholdsUnset,
} from "#billing/application/record-subscription.ts";
import type { SubscriptionEvent } from "#billing/application/record-subscription.ts";
import { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
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
    readonly days: Ref.Ref<readonly string[]>;
    readonly held: Ref.Ref<readonly Subscription[]>;
    readonly problems: Ref.Ref<readonly CreditProblem[]>;
    readonly stripe: Ref.Ref<readonly string[]>;
    readonly trials: Ref.Ref<readonly string[]>;
  }
>()("peal-server/test/billing/RecordLog") {}

const LogLive = Layer.effect(
  RecordLog,
  Effect.all({
    days: Ref.make<readonly string[]>([]),
    held: Ref.make<readonly Subscription[]>([]),
    problems: Ref.make<readonly CreditProblem[]>([]),
    stripe: Ref.make<readonly string[]>([]),
    trials: Ref.make<readonly string[]>([]),
  })
);

// What Stripe answers a threshold: refused for good, not answered, or
// taken.
const refusalOf = (workspace: WorkspaceId, id: string) => {
  if (id === "sub_synthetic_refused") {
    return Effect.fail(
      new StripeUnreachable({ permanent: true, workspaceId: workspace })
    );
  }

  return id === "sub_synthetic_unanswered"
    ? Effect.fail(new StripeUnreachable({ workspaceId: workspace }))
    : Effect.void;
};

// What each legacy plan was paid, invoice by invoice, in euro cents: a
// month from November 1st, and a year from January 1st, 2026, with an
// older month's invoice, whose period is over.
const paid = (
  invoiceId: string,
  amount: number,
  start: string,
  end: string
): PaidInvoice => ({
  invoiceId,
  lines: [{ amount, start: at(start) }],
  paid: { amount, currency: "eur" },
  periodEnd: Option.some(at(end)),
  periodStart: Option.some(at(start)),
});

const legacyInvoices = new Map<string, readonly PaidInvoice[]>([
  [
    "sub_synthetic_legacy",
    [
      paid("in_november", 1900, "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z"),
      paid("in_october", 1900, "2026-10-01T00:00:00Z", "2026-11-01T00:00:00Z"),
    ],
  ],
  [
    "sub_synthetic_refused_credit",
    [paid("in_refused", 1900, "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z")],
  ],
  [
    "sub_synthetic_yearly",
    [paid("in_year", 19_000, "2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z")],
  ],
]);

// The day each retired subscription was retired to.
const retiredTo = new Map<string, DateTime.Utc>();

// When each subscription's latest event recorded happened.
const lastEvents = new Map<string, DateTime.Utc>();

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
          markPaidInvoice: () => Effect.void,
          perAccount: () => Effect.succeed([]),
          // An event older than the one kept changes nothing.
          record: (change) =>
            Effect.suspend(() => {
              const id = change.subscription.stripeSubscriptionId;
              const kept = lastEvents.get(id);

              if (
                kept !== undefined &&
                DateTime.isLessThan(change.occurredAt, kept)
              ) {
                return Effect.succeed("stale" as const);
              }

              lastEvents.set(id, change.occurredAt);

              return Ref.update(held, (all) => [
                ...all.filter(
                  ({ stripeSubscriptionId }) => stripeSubscriptionId !== id
                ),
                change.subscription,
              ]).pipe(Effect.as("recorded" as const));
            }),
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
          // Stripe refuses for good any credit of one subscription.
          credit: (workspace, id, credits, reason) =>
            id === "sub_synthetic_refused_credit"
              ? Effect.fail(
                  new StripeUnreachable({
                    code: "credit_note_amount_too_large",
                    permanent: true,
                    workspaceId: workspace,
                  })
                )
              : asked(
                  `credit ${id} ${credits
                    .map(({ amount, invoiceId }) => `${invoiceId}:${amount}`)
                    .join(",")} ${reason._tag}`
                ).pipe(Effect.as([])),
          endAtTrialEnd: (_workspace, id, end) =>
            asked(`endAtTrialEnd ${id} ${DateTime.formatIso(end)}`),
          retireAt: () => Effect.die("not retired here"),
          endAndInvoice: (_workspace, id, reason) =>
            asked(`endAndInvoice ${id} ${reason}`),
          endNow: (_workspace, id, reason) => asked(`endNow ${id} ${reason}`),
          isBusiness: () => Effect.succeed(false),
          paidInvoices: (_workspace, id) =>
            Effect.succeed(legacyInvoices.get(id) ?? []),
          upcomingTotal: () => Effect.succeed(Option.none()),
        })
      );
    })
  ),
  Layer.effect(
    UsageBilling,
    RecordLog.use(({ stripe }) =>
      Effect.succeed(
        UsageBilling.of({
          ensureItems: () => Effect.die("not asked here"),
          eventNames: {
            accounts: "peal_accounts",
            assistantImages: "peal_assistant_images",
            assistantRequests: "peal_assistant_requests",
            managedAds: "peal_managed_ads",
            outboundMessages: "peal_outbound_messages",
            xApi: "peal_x_api",
          },
          report: () => Effect.die("not asked here"),
          setThreshold: (workspace, id, cents) =>
            Ref.update(stripe, (all) => [
              ...all,
              `setThreshold ${id} ${cents.pipe(
                Option.map((amount) => `${amount}`),
                Option.getOrElse(() => "none")
              )}`,
            ]).pipe(Effect.andThen(refusalOf(workspace, id))),
        })
      )
    )
  ),
  // The holders whose day so far was reported.
  Layer.effect(
    AccountDays,
    RecordLog.use(({ days }) =>
      Effect.succeed(
        AccountDays.of({
          bindPool: () => Effect.void,
          counted: () => Effect.die("not counted here"),
          ofDays: () => Effect.succeed([]),
          ofMonth: () => Effect.succeed([]),
          raise: () => Effect.succeed([]),
          subscribed: (holder) => Ref.update(days, (all) => [...all, holder]),
        })
      )
    )
  ),
  Layer.effect(
    CreditProblems,
    RecordLog.use(({ problems }) =>
      Effect.succeed(
        CreditProblems.of({
          latest: () => Ref.get(problems),
          record: (problem) =>
            Ref.update(problems, (all) => [...all, problem]).pipe(
              Effect.as(true)
            ),
        })
      )
    )
  ),
  Layer.mock(PlanRetirements, {
    retiresAt: (id) =>
      Effect.succeed(Option.fromUndefinedOr(retiredTo.get(id))),
  }),
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
    Ref.set(log.days, []),
    Ref.set(log.held, []),
    Ref.set(log.problems, []),
    Effect.sync(() => {
      lastEvents.clear();
      retiredTo.clear();
    }),
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
    "ends a trial at once once per-account pricing is recorded, and a legacy plan at once, credited its unused time",
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

        // Per-account pricing starts on November 16th, 00:00: 15 of
        // November's 30 days were not used.
        const moving = {
          plan: "payAsYouGo" as const,
          startedAt: Option.some(at("2026-11-16T00:00:00Z")),
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_accounts",
          trialEnd: Option.none(),
        };

        yield* record(moving);

        assert.deepStrictEqual(yield* askedOfStripe, [
          "setThreshold sub_synthetic_accounts 10000",
          "endNow sub_synthetic_trial orderedDuringTrial",
          "credit sub_synthetic_legacy in_november:950,in_october:0 movedToRateCard",
          "endNow sub_synthetic_legacy movedToRateCard",
        ]);

        // Recorded again, the same credit is asked under the same key,
        // which Stripe's credit notes keep: it is made once.
        yield* RecordLog.use(({ stripe }) => Ref.set(stripe, []));
        yield* record({ ...moving, occurredAt: at("2026-11-17T09:00:00Z") });

        assert.includeDeepMembers(
          [...(yield* askedOfStripe)],
          [
            "credit sub_synthetic_legacy in_november:950,in_october:0 movedToRateCard",
          ]
        );
      })
  );

  it.effect(
    "credits a yearly legacy plan its unused time, and one already set to end with its period too",
    () =>
      Effect.gen(function* yearly() {
        yield* reset;
        yield* record({
          cancelAtPeriodEnd: true,
          interval: "year",
          plan: "pro",
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_yearly",
          trialEnd: Option.none(),
        });
        yield* RecordLog.use(({ stripe }) => Ref.set(stripe, []));

        yield* record({
          plan: "payAsYouGo",
          startedAt: Option.some(at("2026-11-16T00:00:00Z")),
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_accounts",
          trialEnd: Option.none(),
        });

        // 46 of the year's 365 days were not used: 19,000 × 46 / 365.
        assert.deepStrictEqual(yield* askedOfStripe, [
          "setThreshold sub_synthetic_accounts 10000",
          "credit sub_synthetic_yearly in_year:2394 movedToRateCard",
          "endNow sub_synthetic_yearly movedToRateCard",
        ]);
      })
  );

  it.effect(
    "ends a legacy plan whose credit Stripe refuses for good, records the refusal for staff and counts it",
    () =>
      Effect.gen(function* refused() {
        const before = (yield* Metric.value(creditProblemsCount)).count;

        yield* reset;
        yield* record({
          plan: "starter",
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_refused_credit",
          trialEnd: Option.none(),
        });
        yield* RecordLog.use(({ stripe }) => Ref.set(stripe, []));

        const outcome = yield* record({
          plan: "payAsYouGo",
          startedAt: Option.some(at("2026-11-16T00:00:00Z")),
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_accounts",
          trialEnd: Option.none(),
        });

        assert.strictEqual(outcome, "recorded");
        assert.include(
          yield* askedOfStripe,
          "endNow sub_synthetic_refused_credit movedToRateCard"
        );

        const problems = yield* RecordLog.use(({ problems: kept }) =>
          Ref.get(kept)
        );

        assert.deepStrictEqual(
          problems.map(({ code, key, kind, reason, workspaceId: of }) => [
            key,
            kind,
            Option.getOrNull(code),
            Option.getOrNull(reason),
            Option.getOrNull(of),
          ]),
          [
            [
              "credit:sub_synthetic_refused_credit:movedToRateCard",
              "creditRefused",
              "credit_note_amount_too_large",
              "movedToRateCard",
              workspaceId,
            ],
          ]
        );
        assert.strictEqual(
          (yield* Metric.value(creditProblemsCount)).count,
          before + 1
        );
      })
  );

  it.effect(
    "credits a retired legacy plan Stripe ended on its day what it was paid for beyond it, and not one ended well before",
    () =>
      Effect.gen(function* retired() {
        yield* reset;
        yield* record({
          plan: "starter",
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_legacy",
          trialEnd: Option.none(),
        });
        yield* Effect.sync(() => {
          retiredTo.set("sub_synthetic_legacy", at("2026-11-16T00:00:00Z"));
        });
        yield* RecordLog.use(({ stripe }) => Ref.set(stripe, []));

        // Ended by Stripe at its day: 15 of November's 30 days go back.
        yield* record({
          occurredAt: at("2026-11-16T00:00:04Z"),
          plan: "starter",
          startedBy: Option.none(),
          status: "canceled",
          stripeSubscriptionId: "sub_synthetic_legacy",
          trialEnd: Option.none(),
        });

        assert.deepStrictEqual(yield* askedOfStripe, [
          "credit sub_synthetic_legacy in_november:950,in_october:0 retirement",
        ]);

        // Ended a week before its day: not the retirement's end.
        yield* reset;
        yield* Effect.sync(() => {
          retiredTo.set("sub_synthetic_legacy", at("2026-11-23T00:00:00Z"));
        });
        yield* record({
          occurredAt: at("2026-11-16T00:00:04Z"),
          plan: "starter",
          startedBy: Option.none(),
          status: "canceled",
          stripeSubscriptionId: "sub_synthetic_legacy",
          trialEnd: Option.none(),
        });

        assert.deepStrictEqual(yield* askedOfStripe, []);
      })
  );

  it.effect(
    "never moves a legacy plan on a late event of a per-account subscription that has ended since",
    () =>
      Effect.gen(function* late() {
        yield* reset;
        yield* record({
          plan: "starter",
          startedBy: Option.none(),
          status: "active",
          stripeSubscriptionId: "sub_synthetic_legacy",
          trialEnd: Option.none(),
        });

        const perAccountEvent = {
          plan: "payAsYouGo" as const,
          startedBy: Option.none(),
          stripeSubscriptionId: "sub_synthetic_accounts",
          trialEnd: Option.none(),
        };

        // Its end is recorded first; its earlier activation comes late.
        yield* record({
          ...perAccountEvent,
          occurredAt: at("2026-11-12T10:00:00Z"),
          status: "canceled",
        });
        yield* RecordLog.use(({ stripe }) => Ref.set(stripe, []));

        const outcome = yield* record({
          ...perAccountEvent,
          occurredAt: at("2026-11-10T10:00:00Z"),
          status: "active",
        });

        assert.strictEqual(outcome, "stale");
        assert.isFalse(
          (yield* askedOfStripe).some((call) =>
            call.includes("sub_synthetic_legacy")
          )
        );
      })
  );

  it.effect(
    "leaves a legacy plan alone while per-account pricing is not paid for",
    () =>
      Effect.gen(function* unpaid() {
        yield* reset;
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
          status: "incomplete",
          stripeSubscriptionId: "sub_synthetic_accounts",
          trialEnd: Option.none(),
        });

        assert.deepStrictEqual(yield* askedOfStripe, []);
      })
  );

  it.effect(
    "ends at once, without a charge, a second per-account subscription of the account, keeping the older",
    () =>
      Effect.gen(function* duplicate() {
        const before = (yield* Metric.value(duplicateSubscriptions)).count;

        yield* reset;
        yield* perAccount("sub_synthetic_first", "2026-11-09T10:00:00Z");
        yield* perAccount("sub_synthetic_second", "2026-11-09T10:05:00Z");

        assert.deepStrictEqual(yield* askedOfStripe, [
          "setThreshold sub_synthetic_first 10000",
          "setThreshold sub_synthetic_second 10000",
          "endNow sub_synthetic_second duplicateSubscription",
        ]);

        // The older one's event arriving last ends the newer one too.
        yield* reset;
        yield* perAccount("sub_synthetic_late", "2026-11-09T10:05:00Z");
        yield* perAccount("sub_synthetic_early", "2026-11-09T10:00:00Z");

        assert.deepStrictEqual(yield* askedOfStripe, [
          "setThreshold sub_synthetic_late 10000",
          "setThreshold sub_synthetic_early 10000",
          "endNow sub_synthetic_late duplicateSubscription",
        ]);
        // Each counted, for the alert (peal-duplicate-subscription).
        assert.strictEqual(
          (yield* Metric.value(duplicateSubscriptions)).count - before,
          2
        );
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

  it.effect(
    "sets a new per-account subscription to invoice at the unverified threshold, and reports its holder's day so far",
    () =>
      Effect.gen(function* firstRecorded() {
        yield* reset;
        yield* record({
          plan: "payAsYouGo",
          startedBy: Option.none(),
          status: "incomplete",
          stripeSubscriptionId: "sub_synthetic_new",
          trialEnd: Option.none(),
        });

        // Not paid yet: nothing asked, nothing reported.
        assert.deepStrictEqual(yield* askedOfStripe, []);
        assert.deepStrictEqual(
          yield* RecordLog.use(({ days }) => Ref.get(days)),
          []
        );

        yield* perAccount("sub_synthetic_new", "2026-11-09T10:00:00Z");
        // Recorded again, paying: the threshold is not asked again, the
        // day is (it reports only what is left).
        yield* perAccount("sub_synthetic_new", "2026-11-09T10:00:00Z");

        assert.deepStrictEqual(yield* askedOfStripe, [
          "setThreshold sub_synthetic_new 10000",
        ]);
        assert.deepStrictEqual(
          yield* RecordLog.use(({ days }) => Ref.get(days)),
          [workspaceId, workspaceId]
        );
      })
  );

  it.effect(
    "records a per-account subscription whose threshold Stripe refuses for good, and counts it; fails while Stripe does not answer",
    () =>
      Effect.gen(function* thresholdRefused() {
        const before = (yield* Metric.value(thresholdsUnset)).count;

        yield* reset;

        assert.strictEqual(
          yield* perAccount("sub_synthetic_refused", "2026-11-09T10:00:00Z"),
          "recorded"
        );
        assert.strictEqual(
          (yield* Metric.value(thresholdsUnset)).count - before,
          1
        );

        const unanswered = yield* perAccount(
          "sub_synthetic_unanswered",
          "2026-11-09T10:00:00Z"
        ).pipe(Effect.flip);

        assert.strictEqual(unanswered._tag, "StripeUnreachable");
      })
  );
});
