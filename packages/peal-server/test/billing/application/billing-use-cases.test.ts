import { assert, layer } from "@effect/vitest";
import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import { BillingOverview } from "#billing/application/billing-overview.ts";
import { BillingRecords } from "#billing/application/billing-records.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { Checkouts } from "#billing/application/ports/checkouts.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { RecordSubscription } from "#billing/application/record-subscription.ts";
import type { SubscriptionEvent } from "#billing/application/record-subscription.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

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
      ofWorkspace: () => Ref.get(saved),
      record: (change) =>
        Ref.update(saved, (all) => [...all, change.subscription]).pipe(
          Effect.as("recorded" as const)
        ),
    });
  })
);

const UsageTest = Layer.succeed(
  WorkspaceUsage,
  WorkspaceUsage.of({
    of: () =>
      Effect.succeed({
        assistantRequests: { resetsAt: midnight, used: 4 },
        channels: 2,
        members: 1,
        scheduledPosts: { resetsAt: midnight, used: 12 },
      }),
  })
);

const billingWith = (enabled: boolean) =>
  BillingOverview.layer.pipe(
    Layer.provide(UsageTest),
    Layer.provideMerge(
      Layer.mergeAll(WorkspaceEntitlements.layer, RecordSubscription.layer)
    ),
    Layer.provide(SubscriptionsInMemory),
    Layer.provide(Layer.succeed(BillingMode, BillingMode.of({ enabled })))
  );

const event = (status: string): SubscriptionEvent => ({
  cancelAtPeriodEnd: false,
  currentPeriodEnd: Option.some(DateTime.makeUnsafe("2026-12-09T10:00:00Z")),
  eventId: `evt_synthetic_${status}`,
  occurredAt: DateTime.makeUnsafe("2026-11-09T10:00:00Z"),
  plan: "business",
  status,
  stripeCustomerId: "cus_synthetic",
  stripeSubscriptionId: "sub_synthetic",
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
        ["free", "pro", "business"]
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
        Object.values(entitlements.allowances).every(Option.isNone)
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

// What billing keeps of a workspace, for its exports and erasures, on a
// server that bills or not.
const recordsWith = (enabled: boolean) =>
  Layer.mergeAll(BillingRecords.layer, RecordSubscription.layer).pipe(
    Layer.provide(SubscriptionsInMemory),
    Layer.provideMerge(CheckoutsInMemory),
    Layer.provide(Layer.succeed(BillingMode, BillingMode.of({ enabled })))
  );

const periodEnd = DateTime.makeUnsafe("2026-12-09T10:00:00Z");

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
          plan: "business",
          subscriptions: [
            {
              cancelAtPeriodEnd: false,
              currentPeriodEnd: periodEnd,
              plan: "business",
              status: "active",
            },
          ],
        });

        const refused = yield* records
          .eraseWorkspace(workspaceId)
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "WorkspaceStillBilled");
        // What cancelling would end, for the person to read first.
        assert.deepInclude(refused, {
          paidUntil: Option.some(periodEnd),
          plan: Option.some("business" as const),
        });
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

        const erased = yield* records.eraseWorkspace(workspaceId, {
          cancelSubscriptions: true,
        });

        assert.deepStrictEqual(erased, { subscriptionsCancelled: 1 });
        assert.deepStrictEqual(yield* Ref.get(log.cancelledKnown), [
          "sub_synthetic",
        ]);
        // Its open checkouts went first, so none starts another.
        assert.strictEqual(yield* Ref.get(log.expired), 1);
        assert.deepStrictEqual(yield* records.exportWorkspace(workspaceId), {
          plan: "free",
          subscriptions: [],
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

          const refused = yield* BillingRecords.use((records) =>
            records.eraseWorkspace(workspaceId)
          ).pipe(Effect.flip);

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

          const erase = BillingRecords.use((records) =>
            records.eraseWorkspace(workspaceId)
          );

          yield* Ref.set(log.open, 1);

          for (const status of [
            "active",
            "trialing",
            "past_due",
            "paused",
            "new_one",
          ]) {
            yield* Ref.set(log.statuses, ["incomplete", status]);

            const refused = yield* Effect.flip(erase);

            assert.strictEqual(refused._tag, "WorkspaceStillBilled", status);
          }

          assert.strictEqual(yield* Ref.get(log.expired), 0);

          // A checkout never completed, or a subscription that ended.
          yield* Ref.set(log.statuses, [
            "incomplete",
            "incomplete_expired",
            "canceled",
          ]);

          yield* erase;

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

          const erase = BillingRecords.use((records) =>
            records.eraseWorkspace(workspaceId)
          );

          yield* Ref.set(log.statuses, ["incomplete"]);
          yield* Ref.set(log.atStripe, ["canceled", "active"]);

          const refused = yield* Effect.flip(erase);

          assert.strictEqual(refused._tag, "WorkspaceStillBilled");

          yield* Ref.set(log.atStripe, ["canceled", "incomplete_expired"]);

          yield* erase;
        })
    );

    it.effect("cancel what Stripe holds when the deletion says to", () =>
      Effect.gen(function* cancelUnseen() {
        const log = yield* CheckoutsLog;

        yield* Ref.set(log.statuses, ["active"]);
        yield* Ref.set(log.atStripe, ["canceled", "active"]);

        const refused = yield* BillingRecords.use((records) =>
          records.eraseWorkspace(workspaceId)
        ).pipe(Effect.flip);

        // Nothing billing recorded tells the plan yet.
        assert.deepInclude(refused, { plan: Option.none() });

        const erased = yield* BillingRecords.use((records) =>
          records.eraseWorkspace(workspaceId, { cancelSubscriptions: true })
        );

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

        yield* BillingRecords.use((records) =>
          records.eraseWorkspace(workspaceId)
        );

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

        yield* records.eraseWorkspace(workspaceId);

        assert.deepStrictEqual(yield* records.exportWorkspace(workspaceId), {
          plan: "free",
          subscriptions: [],
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

        yield* records.eraseWorkspace(workspaceId);

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
      Layer.succeed(BillingMode, BillingMode.of({ enabled: false })),
      Layer.succeed(
        Checkouts,
        Checkouts.of({
          atStripe: () => Effect.die("Stripe called while billing is off"),
          cancelBilled: () => Effect.die("Stripe called while billing is off"),
          expireOpen: () => Effect.die("Stripe called while billing is off"),
          statuses: () => Effect.die("read while billing is off"),
        })
      ),
      Layer.succeed(
        Subscriptions,
        Subscriptions.of({
          eraseWorkspace: () => Effect.void,
          ofWorkspace: () => Effect.die("read while billing is off"),
          record: () => Effect.die("not used"),
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

      yield* BillingRecords.use((records) =>
        records.eraseWorkspace(workspaceId)
      );

      const erased = yield* BillingRecords.use((records) =>
        records.eraseWorkspace(workspaceId, { cancelSubscriptions: true })
      );

      assert.deepStrictEqual(erased, { subscriptionsCancelled: 0 });
    })
  );
});
