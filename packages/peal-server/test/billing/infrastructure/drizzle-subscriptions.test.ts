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
import { statementsOf } from "#test/shared/support.ts";

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
      currentPeriodStart: Option.none(),
      interval: "month",
      plan: "pro",
      startedAt: Option.none(),
      status: options.status,
      stripeCustomerId: "cus_synthetic",
      stripeSubscriptionId: options.subscriptionId,
      trialEnd: Option.none(),
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

  it.effect(
    "keep the event further along of two in the same second, in either order",
    () =>
      Effect.gen(function* sameSecond() {
        const subscriptions = yield* Subscriptions;

        // Stripe dates both to the second, and may deliver the update first.
        const delivered = Effect.fn("delivered")(function* delivered(
          first: SubscriptionStatus,
          second: SubscriptionStatus
        ) {
          const workspaceId = yield* freshWorkspace;
          const subscriptionId = yield* freshStripeId("sub");

          const outcomes = [
            yield* subscriptions.record(
              changeOf(workspaceId, {
                eventId: yield* freshStripeId("evt"),
                occurredAt: "2026-11-09T10:00:00Z",
                status: first,
                subscriptionId,
              })
            ),
            yield* subscriptions.record(
              changeOf(workspaceId, {
                eventId: yield* freshStripeId("evt"),
                occurredAt: "2026-11-09T10:00:00Z",
                status: second,
                subscriptionId,
              })
            ),
          ];

          return { outcomes, statuses: yield* statusesOf(workspaceId) };
        });

        assert.deepStrictEqual(yield* delivered("active", "incomplete"), {
          outcomes: ["recorded", "stale"],
          statuses: ["active"],
        });

        assert.deepStrictEqual(yield* delivered("incomplete", "active"), {
          outcomes: ["recorded", "recorded"],
          statuses: ["active"],
        });

        assert.deepStrictEqual(yield* delivered("canceled", "active"), {
          outcomes: ["recorded", "stale"],
          statuses: ["canceled"],
        });

        // Two of the same stage apply in the order they arrive.
        assert.deepStrictEqual(yield* delivered("active", "past_due"), {
          outcomes: ["recorded", "recorded"],
          statuses: ["past_due"],
        });
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

  it.effect(
    "list several workspaces' subscriptions at once as each one's, in one statement",
    () =>
      Effect.gen(function* several() {
        const subscriptions = yield* Subscriptions;
        const twice = yield* freshWorkspace;
        const once = yield* freshWorkspace;
        const never = yield* freshWorkspace;

        for (const [workspaceId, status] of [
          [twice, "canceled"],
          [twice, "active"],
          [once, "trialing"],
        ] as const) {
          yield* subscriptions.record(
            changeOf(workspaceId, {
              eventId: yield* freshStripeId("evt"),
              occurredAt: "2026-11-09T10:00:00Z",
              status,
              subscriptionId: yield* freshStripeId("sub"),
            })
          );
        }

        const ids = [twice, once, never];

        const { result, statements } = yield* statementsOf(
          subscriptions.ofWorkspaces(ids)
        );

        for (const id of ids) {
          assert.deepStrictEqual(
            result.get(id) ?? [],
            yield* subscriptions.ofWorkspace(id)
          );
        }

        assert.strictEqual(statements, 1);
        assert.isFalse(result.has(never));
        assert.deepStrictEqual(
          yield* statementsOf(subscriptions.ofWorkspaces([])),
          { result: new Map(), statements: 0 }
        );
      })
  );
});
