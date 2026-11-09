import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";

import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { SubscriptionChange } from "#billing/domain/subscription-change.ts";
import { Subscription } from "#billing/domain/subscription.ts";
import type { SubscriptionStatus } from "#billing/domain/subscription.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import { Ids } from "#shared/application/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

const RepositoryTest = DrizzleSubscriptionsLive.pipe(
  Layer.provideMerge(DatabaseTest)
);

// Ids unique to the run, as Stripe's are.
const freshStripeId = (prefix: string) =>
  Ids.use((ids) => ids.next).pipe(Effect.map((id) => `${prefix}_${id}`));

const changeOf = (
  workspaceId: WorkspaceId,
  options: {
    readonly eventId: string;
    readonly occurredAt: string;
    readonly status: SubscriptionStatus;
    readonly subscriptionId: string;
  }
) =>
  new SubscriptionChange({
    eventId: options.eventId,
    occurredAt: DateTime.makeUnsafe(options.occurredAt),
    subscription: new Subscription({
      cancelAtPeriodEnd: false,
      currentPeriodEnd: Option.some(
        DateTime.makeUnsafe("2026-12-09T10:00:00Z")
      ),
      plan: "pro",
      status: options.status,
      stripeCustomerId: "cus_synthetic",
      stripeSubscriptionId: options.subscriptionId,
      workspaceId,
    }),
  });

const statusesOf = (workspaceId: WorkspaceId) =>
  Subscriptions.use((subscriptions) =>
    subscriptions.ofWorkspace(workspaceId)
  ).pipe(Effect.map((found) => found.map(({ status }) => status)));

layer(RepositoryTest)("the subscriptions in Postgres", (it) => {
  it.effect("keep what the latest event says of each subscription", () =>
    Effect.gen(function* latest() {
      const subscriptions = yield* Subscriptions;
      const workspaceId = yield* freshWorkspace;
      const subscriptionId = yield* freshStripeId("sub");

      const created = changeOf(workspaceId, {
        eventId: yield* freshStripeId("evt"),
        occurredAt: "2026-11-09T10:00:00Z",
        status: "incomplete",
        subscriptionId,
      });

      const paid = changeOf(workspaceId, {
        eventId: yield* freshStripeId("evt"),
        occurredAt: "2026-11-09T10:00:05Z",
        status: "active",
        subscriptionId,
      });

      assert.strictEqual(yield* subscriptions.record(created), "recorded");
      assert.strictEqual(yield* subscriptions.record(paid), "recorded");

      const [found] = yield* subscriptions.ofWorkspace(workspaceId);

      assert.deepStrictEqual(found, paid.subscription);
    })
  );

  it.effect("record an event delivered twice once", () =>
    Effect.gen(function* twice() {
      const subscriptions = yield* Subscriptions;
      const workspaceId = yield* freshWorkspace;

      const change = changeOf(workspaceId, {
        eventId: yield* freshStripeId("evt"),
        occurredAt: "2026-11-09T10:00:00Z",
        status: "active",
        subscriptionId: yield* freshStripeId("sub"),
      });

      const outcomes = yield* Effect.all(
        [subscriptions.record(change), subscriptions.record(change)],
        { concurrency: "unbounded" }
      );

      assert.deepStrictEqual(outcomes.toSorted(), ["duplicate", "recorded"]);
      assert.deepStrictEqual(yield* statusesOf(workspaceId), ["active"]);
    })
  );

  it.effect("leave a subscription as a later event left it", () =>
    Effect.gen(function* stale() {
      const subscriptions = yield* Subscriptions;
      const workspaceId = yield* freshWorkspace;
      const subscriptionId = yield* freshStripeId("sub");

      const cancelled = changeOf(workspaceId, {
        eventId: yield* freshStripeId("evt"),
        occurredAt: "2026-11-09T12:00:00Z",
        status: "canceled",
        subscriptionId,
      });

      const late = changeOf(workspaceId, {
        eventId: yield* freshStripeId("evt"),
        occurredAt: "2026-11-09T11:00:00Z",
        status: "active",
        subscriptionId,
      });

      assert.strictEqual(yield* subscriptions.record(cancelled), "recorded");
      assert.strictEqual(yield* subscriptions.record(late), "stale");
      assert.deepStrictEqual(yield* statusesOf(workspaceId), ["canceled"]);
    })
  );

  it.effect("list only the workspace's own subscriptions", () =>
    Effect.gen(function* own() {
      const subscriptions = yield* Subscriptions;
      const mine = yield* freshWorkspace;
      const other = yield* freshWorkspace;

      yield* subscriptions.record(
        changeOf(other, {
          eventId: yield* freshStripeId("evt"),
          occurredAt: "2026-11-09T10:00:00Z",
          status: "active",
          subscriptionId: yield* freshStripeId("sub"),
        })
      );

      assert.deepStrictEqual(yield* statusesOf(mine), []);
      assert.deepStrictEqual(yield* statusesOf(other), ["active"]);
    })
  );
});
