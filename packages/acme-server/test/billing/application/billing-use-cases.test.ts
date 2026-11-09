import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";

import { BilledWorkspaces } from "#billing/application/billed-workspaces.ts";
import { BillingOverview } from "#billing/application/billing-overview.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
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

// Whether a workspace is still billed, once it has a subscription of each
// status the test records.
const BilledTest = Layer.mergeAll(
  BilledWorkspaces.layer,
  RecordSubscription.layer
).pipe(
  Layer.provide(SubscriptionsInMemory),
  Layer.provide(Layer.succeed(BillingMode, BillingMode.of({ enabled: true })))
);

layer(BilledTest)("a workspace Stripe may still bill", (it) => {
  it.effect("is one with a subscription unpaid, not only cancelled", () =>
    Effect.gen(function* billed() {
      const stillBilled = BilledWorkspaces.use((billing) =>
        billing.stillBilled(workspaceId)
      );

      assert.isFalse(yield* stillBilled);

      yield* RecordSubscription.use((record) =>
        record.record(event("canceled"))
      );

      assert.isFalse(yield* stillBilled);

      // Unpaid gives no plan, but Stripe still has it.
      yield* RecordSubscription.use((record) => record.record(event("unpaid")));

      assert.isTrue(yield* stillBilled);
    })
  );
});

// Billing off, with subscriptions that may not be read.
const UnreadTest = Layer.mergeAll(
  WorkspaceEntitlements.layer,
  BilledWorkspaces.layer
).pipe(
  Layer.provide(
    Layer.mergeAll(
      Layer.succeed(BillingMode, BillingMode.of({ enabled: false })),
      Layer.succeed(
        Subscriptions,
        Subscriptions.of({
          ofWorkspace: () => Effect.die("read while billing is off"),
          record: () => Effect.die("not used"),
        })
      )
    )
  )
);

layer(UnreadTest)("billing off", (it) => {
  it.effect("reads no subscription", () =>
    Effect.gen(function* noRead() {
      const entitlements = yield* WorkspaceEntitlements.use((found) =>
        found.of(workspaceId)
      );

      assert.isTrue(Option.isNone(entitlements.plan));
      assert.isFalse(
        yield* BilledWorkspaces.use((billing) =>
          billing.stillBilled(workspaceId)
        )
      );
    })
  );
});
