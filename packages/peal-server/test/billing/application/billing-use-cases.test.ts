import { assert, layer } from "@effect/vitest";
import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { BillingOverview } from "#billing/application/billing-overview.ts";
import { BillingRecords } from "#billing/application/billing-records.ts";
import { MeteredPosts } from "#billing/application/metered-posts.ts";
import { AccountDayStore } from "#billing/application/ports/account-day-store.ts";
import { AccountPayers } from "#billing/application/ports/account-payers.ts";
import { BillingAccountStore } from "#billing/application/ports/billing-account-store.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { Checkouts } from "#billing/application/ports/checkouts.ts";
import { MeteredPostLedger } from "#billing/application/ports/metered-post-ledger.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { UsageLedger } from "#billing/application/ports/usage-ledger.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { RecordSubscription } from "#billing/application/record-subscription.ts";
import type { SubscriptionEvent } from "#billing/application/record-subscription.ts";
import { RecordedUsage } from "#billing/application/recorded-usage.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import type { MeteredPostCount } from "#billing/domain/metered-posts.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import type { UsageRecord } from "#billing/domain/usage-meter.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import {
  AccountDaysInMemory,
  AccountDaysUncountedTest,
  AloneInAccountsTest,
  NoOwnChannelsTest,
  NoAddressesTest,
  NoContractsTest,
  NoTrialsTest,
  PlainPseudonymsTest,
  StripeUncalledTest,
  UsageBillingUncalledTest,
} from "#test/billing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f"
);

const actorWith = (permissions: readonly Permission[]) =>
  new Actor({
    permissions,
    subject: {
      _tag: "user",
      impersonatedBy: Option.none(),
      userId: UserIdSchema.make("8d9e0f1a-2b3c-4d5e-9f6a-7b8c9d0e1f2a"),
    },
    workspaceId,
  });

const midnight = DateTime.makeUnsafe("2026-11-10T00:00:00Z");

// Subscriptions kept in memory, as recorded.
const SubscriptionsInMemory = Layer.effect(
  Subscriptions,
  Effect.gen(function* inMemory() {
    const saved = yield* Ref.make<readonly Subscription[]>([]);

    return Subscriptions.of({
      eraseWorkspace: () => Ref.set(saved, []),
      forgetUser: () => Effect.void,
      ofWorkspace: () => Ref.get(saved),
      ofWorkspaces: () => Effect.die("not read here"),
      markPaidInvoice: () => Effect.void,
      perAccount: () => Effect.succeed([]),
      record: (change) =>
        Ref.update(saved, (all) => [...all, change.subscription]).pipe(
          Effect.as("recorded" as const)
        ),
      remindable: () => Ref.get(saved),
    });
  })
);

const UsageTest = Layer.succeed(
  WorkspaceUsage,
  WorkspaceUsage.of({
    heldIn: () => Effect.die("not read here"),
    of: () =>
      Effect.succeed({
        assistantRequests: { resetsAt: midnight, used: 4 },
        channels: 2,
        mediaStorage: 0,
        members: 1,
        scheduledPosts: { resetsAt: midnight, used: 12 },
      }),
  })
);

// A workspace deleted while Stripe's event about it was on its way.
const deletedWorkspace = WorkspaceIdSchema.make(
  "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a"
);

// Transactions in memory: what runs in one is all that is checked.
const TransactionsTest = Layer.succeed(
  TransactionRunner,
  TransactionRunner.of({ transaction: (effect) => effect })
);

// The workspaces as the webhook finds them: all there but one.
const WorkspacesTest = Layer.mock(Checkouts, {
  holdWorkspace: (id) => Effect.succeed(id !== deletedWorkspace),
});

// Stripe says nothing of the next invoice; anything else dies.
const NoUpcomingTest = Layer.mock(StripeContracts, {
  upcomingTotal: () => Effect.succeedNone,
});

const billingWith = (enabled: boolean) =>
  BillingOverview.layer.pipe(
    Layer.provide(UsageTest),
    Layer.provideMerge(
      Layer.mergeAll(WorkspaceEntitlements.layer, RecordSubscription.layer)
    ),
    Layer.provide(
      Layer.mergeAll(
        SubscriptionsInMemory,
        NoTrialsTest,
        NoUpcomingTest,
        NoAddressesTest,
        PlainPseudonymsTest,
        AloneInAccountsTest,
        AccountDaysUncountedTest,
        UsageBillingUncalledTest,
        NoOwnChannelsTest,
        PlanHolders.layerOwn
      )
    ),
    Layer.provide(Layer.mergeAll(TransactionsTest, WorkspacesTest)),
    Layer.provide(
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      )
    )
  );

const event = (status: string): SubscriptionEvent => ({
  cancelAt: Option.none(),
  cancelAtPeriodEnd: false,
  currentPeriodEnd: Option.some(DateTime.makeUnsafe("2026-12-09T10:00:00Z")),
  currentPeriodStart: Option.some(DateTime.makeUnsafe("2026-11-09T10:00:00Z")),
  eventId: `evt_synthetic_${status}`,
  interval: "month",
  occurredAt: DateTime.makeUnsafe("2026-11-09T10:00:00Z"),
  plan: "business",
  startedAt: Option.some(DateTime.makeUnsafe("2026-11-09T10:00:00Z")),
  startedBy: Option.none(),
  status,
  stripeCustomerId: "cus_synthetic",
  stripeSubscriptionId: "sub_synthetic",
  trialEnd: Option.none(),
  workspaceId,
});

layer(billingWith(true))("billing on a server that bills", (it) => {
  it.effect("gives a workspace the plan its subscription buys", () =>
    Effect.gen(function* plan() {
      const before = yield* WorkspaceEntitlements.use((entitlements) =>
        entitlements.of(workspaceId)
      );

      assert.deepStrictEqual(before.plan, Option.some("free"));

      const recorded = yield* RecordSubscription.use((record) =>
        record.record(event("active"))
      );

      assert.strictEqual(recorded, "recorded");

      const after = yield* WorkspaceEntitlements.use((entitlements) =>
        entitlements.of(workspaceId)
      );

      assert.deepStrictEqual(after.plan, Option.some("business"));
    })
  );

  it.effect("ignores an event about a workspace deleted meanwhile", () =>
    Effect.gen(function* gone() {
      const outcome = yield* RecordSubscription.use((record) =>
        record.record({ ...event("canceled"), workspaceId: deletedWorkspace })
      );

      assert.strictEqual(outcome, "ignored");
    })
  );

  it.effect("ignores a status it does not know, recording nothing", () =>
    Effect.gen(function* unknown() {
      const outcome = yield* RecordSubscription.use((record) =>
        record.record(event("some_future_status"))
      );

      assert.strictEqual(outcome, "ignored");
    })
  );

  it.effect("shows billing:read members the plans and the usage", () =>
    Effect.gen(function* overview() {
      const found = yield* BillingOverview.use((billing) =>
        billing.of(actorWith(["billing:read"]))
      );

      assert.deepStrictEqual(
        found.plans.map(({ plan }) => plan),
        ["free", "payAsYouGo"]
      );
      assert.strictEqual(found.usage.channels, 2);

      const refused = yield* BillingOverview.use((billing) =>
        billing.of(actorWith(["channel:read"]))
      ).pipe(Effect.flip);

      assert.strictEqual(refused._tag, "MissingPermission");
    })
  );
});

layer(billingWith(false))("billing on a server that does not bill", (it) => {
  it.effect("limits nothing, whatever was recorded", () =>
    Effect.gen(function* off() {
      yield* RecordSubscription.use((record) => record.record(event("active")));

      const entitlements = yield* WorkspaceEntitlements.use((found) =>
        found.of(workspaceId)
      );

      assert.isTrue(Option.isNone(entitlements.plan));
      assert.isTrue(
        Object.values(entitlements.allowancesFor(0)).every(Option.isNone)
      );

      const found = yield* BillingOverview.use((billing) =>
        billing.of(actorWith(["billing:read"]))
      );

      assert.deepStrictEqual(found.plans, []);
    })
  );
});

// What the Stripe plugin holds of the workspace's checkouts: the statuses
// a test sets, the open Checkout Sessions, which expiring empties, and the
// statuses of the subscriptions Stripe holds, which cancelling ends, with
// the subscriptions billing named to cancel.
class CheckoutsLog extends Context.Service<
  CheckoutsLog,
  {
    readonly atStripe: Ref.Ref<readonly string[]>;
    readonly cancelledKnown: Ref.Ref<readonly string[]>;
    readonly expired: Ref.Ref<number>;
    readonly open: Ref.Ref<number>;
    readonly statuses: Ref.Ref<readonly string[]>;
  }
>()("peal-server/test/billing/CheckoutsLog") {}

// Cancels what may bill, and counts it.
const cancelIn = (
  held: Ref.Ref<readonly string[]>,
  mayBill: (status: string) => boolean
) =>
  Ref.modify(held, (all) => [
    all.filter(mayBill).length,
    all.map((status) => (mayBill(status) ? "canceled" : status)),
  ]);

const CheckoutsInMemory = Layer.effect(
  Checkouts,
  Effect.gen(function* inMemory() {
    const { atStripe, cancelledKnown, expired, open, statuses } =
      yield* CheckoutsLog;

    return Checkouts.of({
      atStripe: () => Ref.get(atStripe),
      cancelBilled: (_workspaceId, { known, mayBill }) =>
        Effect.all([
          cancelIn(atStripe, mayBill),
          cancelIn(statuses, mayBill),
        ]).pipe(
          Effect.tap(() => Ref.set(cancelledKnown, known)),
          Effect.map(([stripe, started]) => stripe + started + known.length)
        ),
      expireOpen: () =>
        Ref.getAndSet(open, 0).pipe(
          Effect.tap((count) => Ref.update(expired, (all) => all + count))
        ),
      holdWorkspace: () => Effect.succeed(true),
      statuses: () => Ref.get(statuses),
    });
  })
).pipe(
  Layer.provideMerge(
    Layer.effect(
      CheckoutsLog,
      Effect.all({
        atStripe: Ref.make<readonly string[]>([]),
        cancelledKnown: Ref.make<readonly string[]>([]),
        expired: Ref.make(0),
        open: Ref.make(0),
        statuses: Ref.make<readonly string[]>([]),
      })
    )
  )
);

// The metered posts' counts in memory, by month and platform.
const MeteredPostsInMemory = Layer.effect(
  MeteredPostLedger,
  Effect.gen(function* inMemory() {
    const counts = yield* Ref.make<readonly MeteredPostCount[]>([]);

    return MeteredPostLedger.of({
      add: ({ month, platform, withLink }) =>
        Ref.update(counts, (all) => {
          const same = (count: MeteredPostCount) =>
            count.platform === platform &&
            DateTime.Equivalence(count.month, month);

          const found = all.find(same) ?? {
            month,
            platform,
            posts: 0,
            postsWithLinks: 0,
          };

          return [
            ...all.filter((count) => !same(count)),
            {
              ...found,
              posts: found.posts + 1,
              postsWithLinks: found.postsWithLinks + (withLink ? 1 : 0),
            },
          ];
        }),
      eraseWorkspace: () => Ref.set(counts, []),
      ofWorkspace: () => Ref.get(counts),
      ofWorkspaces: () => Effect.succeed([]),
    });
  })
);

// The usage ledger of the one workspace in memory.
const UsageInMemory = Layer.effect(
  UsageLedger,
  Effect.gen(function* inMemory() {
    const records = yield* Ref.make<readonly UsageRecord[]>([]);

    return UsageLedger.of({
      add: ({ record }) =>
        Ref.update(records, (all) => {
          const same = (kept: UsageRecord) =>
            kept.meter === record.meter &&
            kept.dimension === record.dimension &&
            DateTime.Equivalence(kept.day, record.day);

          const found = all.find(same);

          return [
            ...all.filter((kept) => !same(kept)),
            found === undefined
              ? record
              : { ...found, quantity: found.quantity + record.quantity },
          ];
        }),
      allOf: () => Ref.get(records),
      eraseWorkspace: () => Ref.set(records, []),
      ofWorkspace: () => Ref.get(records),
      ofWorkspaces: () => Effect.succeed([]),
      postsAcross: () => Effect.succeed([]),
      purgeBefore: () => Effect.succeed(0),
      set: () => Effect.void,
    });
  })
);

// What billing keeps of a workspace, for its exports and erasures, on a
// server that bills or not.
const recordsWith = (enabled: boolean) =>
  Layer.mergeAll(
    BillingRecords.layer,
    RecordSubscription.layer,
    MeteredPosts.layer,
    RecordedUsage.layer
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        SubscriptionsInMemory,
        NoTrialsTest,
        StripeUncalledTest,
        NoContractsTest,
        AloneInAccountsTest,
        PlainPseudonymsTest,
        AccountDaysUncountedTest,
        UsageBillingUncalledTest
      )
    ),
    Layer.provide(Layer.mergeAll(MeteredPostsInMemory, UsageInMemory)),
    Layer.provideMerge(AccountDaysInMemory),
    Layer.provide(TransactionsTest),
    Layer.provideMerge(CheckoutsInMemory),
    Layer.provide(
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      )
    )
  );

const periodEnd = DateTime.makeUnsafe("2026-12-09T10:00:00Z");

// Both steps of an erasure: Stripe's side, then the records.
const erase = (options?: { readonly cancelSubscriptions: boolean }) =>
  BillingRecords.use((records) =>
    records
      .settleWorkspace(workspaceId, options)
      .pipe(Effect.tap(() => records.eraseWorkspace(workspaceId)))
  );

const november = DateTime.makeUnsafe("2026-11-01T00:00:00Z");

layer(recordsWith(false))("posts on platforms that bill per post", (it) => {
  it.effect(
    "counts X's by month, those with a link apart, and nothing elsewhere",
    () =>
      Effect.gen(function* counts() {
        const metered = yield* MeteredPosts;
        const records = yield* BillingRecords;

        const published = (
          platform: "mastodon" | "x",
          at: string,
          withLink: boolean
        ) =>
          metered.published({
            platform,
            publishedAt: DateTime.makeUnsafe(at),
            withLink,
            workspaceId,
          });

        yield* published("x", "2026-11-09T10:00:00Z", false);
        yield* published("x", "2026-11-30T23:59:59Z", true);
        yield* published("mastodon", "2026-11-09T10:00:00Z", true);

        const counted: readonly MeteredPostCount[] = [
          { month: november, platform: "x", posts: 2, postsWithLinks: 1 },
        ];

        assert.deepStrictEqual(
          yield* metered.ofWorkspace(workspaceId),
          counted
        );
        assert.deepStrictEqual(
          (yield* records.exportWorkspace(workspaceId)).meteredPosts,
          counted
        );

        // Every post that went out is in the usage ledger, by UTC day.
        const usage = yield* RecordedUsage;

        yield* usage.postWentOut({
          platform: "mastodon",
          publishedAt: DateTime.makeUnsafe("2026-11-09T23:59:59Z"),
          workspaceId,
        });
        yield* usage.postWentOut({
          platform: "mastodon",
          publishedAt: DateTime.makeUnsafe("2026-11-09T00:00:00Z"),
          workspaceId,
        });

        assert.deepStrictEqual(
          (yield* records.exportWorkspace(workspaceId)).usage,
          [
            {
              day: "2026-11-09",
              dimension: "mastodon",
              meter: "publishedPosts",
              quantity: 2,
            },
          ]
        );

        // Its billing account's days, as their billing workspace, and the
        // usage reported of them.
        const days = yield* AccountDayStore;
        const on = DateTime.makeUnsafe("2026-11-09T10:00:00Z");

        yield* days.raise(DateTime.startOf(on, "day"), [
          { count: 3, holder: workspaceId },
        ]);
        yield* days.enqueue(
          [
            {
              createdAt: on,
              eventName: "peal_accounts",
              holder: workspaceId,
              identifier: `acc:${workspaceId}:2026-11-09:3`,
              occurredAt: on,
              stripeCustomerId: "cus_synthetic",
              value: 3,
            },
          ],
          [
            {
              day: DateTime.startOf(on, "day"),
              holder: workspaceId,
              reported: 3,
            },
          ]
        );

        const exported = yield* records.exportWorkspace(workspaceId);

        assert.deepStrictEqual(exported.accountDays, [
          { day: "2026-11-09", peak: 3, reported: 3 },
        ]);
        assert.deepStrictEqual(exported.usageReports, [
          {
            eventName: "peal_accounts",
            occurredAt: on,
            sentAt: null,
            value: 3,
          },
        ]);

        yield* erase();

        assert.lengthOf(yield* metered.ofWorkspace(workspaceId), 0);
        assert.lengthOf((yield* records.exportWorkspace(workspaceId)).usage, 0);
        assert.deepStrictEqual(yield* days.allOf(workspaceId), {
          days: [],
          reports: [],
        });
      })
  );
});

layer(recordsWith(true))("billing's records of a billed workspace", (it) => {
  it.effect(
    "hold its plan and subscriptions, and refuse to go while Stripe may bill it",
    () =>
      Effect.gen(function* billed() {
        const records = yield* BillingRecords;

        yield* RecordSubscription.use((record) =>
          record.record(event("active"))
        );

        assert.deepStrictEqual(yield* records.exportWorkspace(workspaceId), {
          accountDays: [],
          meteredPosts: [],
          plan: "business",
          subscriptions: [
            {
              cancelAtPeriodEnd: false,
              currentPeriodEnd: periodEnd,
              plan: "business",
              status: "active",
            },
          ],
          usage: [],
          usageReports: [],
        });

        const refused = yield* erase().pipe(Effect.flip);

        assert.strictEqual(refused._tag, "WorkspaceStillBilled");
        // What cancelling would end, for the person to read first.
        assert.deepInclude(refused, {
          subscriptions: [
            {
              paidUntil: Option.some(periodEnd),
              plan: Option.some("business" as const),
            },
          ],
        });
        assert.deepStrictEqual(yield* records.billedBy(workspaceId), [
          {
            paidUntil: Option.some(periodEnd),
            plan: Option.some("business" as const),
          },
        ]);
        assert.lengthOf(
          (yield* records.exportWorkspace(workspaceId)).subscriptions,
          1
        );
      })
  );

  it.effect(
    "cancel its subscription at Stripe when the deletion says to, then go",
    () =>
      Effect.gen(function* cancelled() {
        const records = yield* BillingRecords;
        const log = yield* CheckoutsLog;

        yield* Ref.set(log.open, 1);

        const erased = yield* erase({ cancelSubscriptions: true });

        assert.deepStrictEqual(erased, { subscriptionsCancelled: 1 });
        assert.deepStrictEqual(yield* Ref.get(log.cancelledKnown), [
          "sub_synthetic",
        ]);
        // Its open checkouts went first, so none starts another.
        assert.strictEqual(yield* Ref.get(log.expired), 1);
        assert.deepStrictEqual(yield* records.exportWorkspace(workspaceId), {
          accountDays: [],
          meteredPosts: [],
          plan: "free",
          subscriptions: [],
          usage: [],
          usageReports: [],
        });
      })
  );
});

layer(recordsWith(true))(
  "billing's records of a workspace whose subscription is unpaid",
  (it) => {
    it.effect(
      "refuse to go: unpaid gives no plan, but Stripe still has it",
      () =>
        Effect.gen(function* unpaid() {
          yield* RecordSubscription.use((record) =>
            record.record(event("unpaid"))
          );

          const refused = yield* erase().pipe(Effect.flip);

          assert.strictEqual(refused._tag, "WorkspaceStillBilled");
        })
    );
  }
);

// Stripe sends the member back from checkout, and the plugin records the
// subscription, before Stripe's events reach billing.
layer(recordsWith(true))(
  "billing's records of a workspace whose checkout just completed",
  (it) => {
    it.effect(
      "refuse to go while the plugin holds a subscription that may bill, and expire nothing",
      () =>
        Effect.gen(function* checkedOut() {
          const log = yield* CheckoutsLog;

          yield* Ref.set(log.open, 1);

          for (const status of [
            "active",
            "trialing",
            "past_due",
            "paused",
            "new_one",
          ]) {
            yield* Ref.set(log.statuses, ["incomplete", status]);

            const refused = yield* Effect.flip(erase());

            assert.strictEqual(refused._tag, "WorkspaceStillBilled", status);
          }

          assert.strictEqual(yield* Ref.get(log.expired), 0);

          // A checkout never completed, or a subscription that ended.
          yield* Ref.set(log.statuses, [
            "incomplete",
            "incomplete_expired",
            "canceled",
          ]);

          yield* erase();

          assert.strictEqual(yield* Ref.get(log.expired), 1);
        })
    );
  }
);

// A checkout completed at Stripe, the member never came back, and no event
// came yet: only Stripe tells.
layer(recordsWith(true))(
  "billing's records of a workspace whose checkout completed unseen",
  (it) => {
    it.effect(
      "refuse to go while Stripe holds a subscription that may bill it",
      () =>
        Effect.gen(function* unseen() {
          const log = yield* CheckoutsLog;

          yield* Ref.set(log.statuses, ["incomplete"]);
          yield* Ref.set(log.atStripe, ["canceled", "active"]);

          const refused = yield* Effect.flip(erase());

          assert.strictEqual(refused._tag, "WorkspaceStillBilled");

          yield* Ref.set(log.atStripe, ["canceled", "incomplete_expired"]);

          yield* erase();
        })
    );

    it.effect("cancel what Stripe holds when the deletion says to", () =>
      Effect.gen(function* cancelUnseen() {
        const log = yield* CheckoutsLog;

        yield* Ref.set(log.statuses, ["active"]);
        yield* Ref.set(log.atStripe, ["canceled", "active"]);

        const refused = yield* erase().pipe(Effect.flip);

        // Nothing billing recorded tells the plan yet.
        assert.deepInclude(refused, {
          subscriptions: [{ paidUntil: Option.none(), plan: Option.none() }],
        });

        const erased = yield* erase({ cancelSubscriptions: true });

        assert.deepStrictEqual(erased, { subscriptionsCancelled: 2 });
        assert.deepStrictEqual(yield* Ref.get(log.atStripe), [
          "canceled",
          "canceled",
        ]);
      })
    );
  }
);

layer(recordsWith(true))(
  "billing's records of a workspace with a checkout left open",
  (it) => {
    it.effect("expire its open checkouts as it goes, so none completes", () =>
      Effect.gen(function* open() {
        const log = yield* CheckoutsLog;

        yield* Ref.set(log.open, 2);

        yield* erase();

        assert.strictEqual(yield* Ref.get(log.expired), 2);
        assert.strictEqual(yield* Ref.get(log.open), 0);
      })
    );
  }
);

layer(recordsWith(true))(
  "billing's records of a workspace that ended",
  (it) => {
    it.effect("go once no subscription may bill it", () =>
      Effect.gen(function* ended() {
        const records = yield* BillingRecords;

        yield* RecordSubscription.use((record) =>
          record.record(event("canceled"))
        );

        assert.strictEqual(
          (yield* records.exportWorkspace(workspaceId)).plan,
          "free"
        );

        yield* erase();

        assert.deepStrictEqual(yield* records.exportWorkspace(workspaceId), {
          accountDays: [],
          meteredPosts: [],
          plan: "free",
          subscriptions: [],
          usage: [],
          usageReports: [],
        });
      })
    );
  }
);

layer(recordsWith(false))(
  "billing's records on a server that does not bill",
  (it) => {
    it.effect("hold no plan, and never refuse to go", () =>
      Effect.gen(function* off() {
        const records = yield* BillingRecords;

        yield* RecordSubscription.use((record) =>
          record.record(event("active"))
        );

        assert.isNull((yield* records.exportWorkspace(workspaceId)).plan);

        yield* erase();

        assert.lengthOf(
          (yield* records.exportWorkspace(workspaceId)).subscriptions,
          0
        );
      })
    );
  }
);

// Billing off, with subscriptions and checkouts that may not be read.
const UnreadTest = Layer.mergeAll(
  WorkspaceEntitlements.layer,
  BillingRecords.layer
).pipe(
  Layer.provide(
    Layer.mergeAll(
      MeteredPostsInMemory,
      UsageInMemory,
      NoContractsTest,
      AloneInAccountsTest,
      PlainPseudonymsTest,
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled: false,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      ),
      AccountDaysInMemory,
      Layer.succeed(
        Checkouts,
        Checkouts.of({
          atStripe: () => Effect.die("Stripe called while billing is off"),
          cancelBilled: () => Effect.die("Stripe called while billing is off"),
          expireOpen: () => Effect.die("Stripe called while billing is off"),
          holdWorkspace: () => Effect.succeed(true),
          statuses: () => Effect.die("read while billing is off"),
        })
      ),
      Layer.succeed(
        Subscriptions,
        Subscriptions.of({
          eraseWorkspace: () => Effect.void,
          forgetUser: () => Effect.void,
          ofWorkspace: () => Effect.die("read while billing is off"),
          ofWorkspaces: () => Effect.die("read while billing is off"),
          markPaidInvoice: () => Effect.void,
          perAccount: () => Effect.succeed([]),
          record: () => Effect.die("not used"),
          remindable: () => Effect.die("not used"),
        })
      )
    )
  )
);

layer(UnreadTest)("billing off", (it) => {
  it.effect("reads no subscription, and calls no Stripe", () =>
    Effect.gen(function* noRead() {
      const entitlements = yield* WorkspaceEntitlements.use((found) =>
        found.of(workspaceId)
      );

      assert.isTrue(Option.isNone(entitlements.plan));

      yield* erase();

      const erased = yield* erase({ cancelSubscriptions: true });

      assert.deepStrictEqual(erased, { subscriptionsCancelled: 0 });
    })
  );
});

// A person who signed up again with an address a required payment method
// is remembered by: their copy of their data says it is required.
const RememberedTest = BillingRecords.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      SubscriptionsInMemory,
      NoTrialsTest,
      StripeUncalledTest,
      NoContractsTest,
      MeteredPostsInMemory,
      UsageInMemory,
      AccountDaysInMemory,
      CheckoutsInMemory,
      PlainPseudonymsTest,
      Layer.mock(BillingAccounts, {}),
      Layer.mock(AccountPayers, {
        emailOf: () => Effect.succeed(Option.some("Remembered@example.com")),
      }),
      Layer.mock(BillingAccountStore, {
        paidBy: () => Effect.succeed([]),
        requiresPayment: (_userId, pseudonym) =>
          Effect.succeed(
            Option.contains(pseudonym, "pseudonym:remembered@example.com")
          ),
        transfersFor: () => Effect.succeed([]),
        workspacesOfEach: () => Effect.succeed(new Map()),
      }),
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled: true,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      )
    )
  ),
  Layer.provide(TransactionsTest)
);

layer(RememberedTest)("a person's copy of their billing data", (it) => {
  it.effect(
    "says a payment method remembered by their address is required",
    () =>
      Effect.gen(function* remembered() {
        const exported = yield* BillingRecords.use((records) =>
          records.exportUser(
            UserIdSchema.make("6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9d")
          )
        );

        assert.isTrue(exported.billingAccounts.paymentMethodRequired);
      })
  );
});
