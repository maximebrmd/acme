// Orders, trials and withdrawals in Postgres, and what erasing a workspace
// or forgetting a user leaves of them.
import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { ContractRecords } from "#billing/application/ports/contract-records.ts";
import { Orders } from "#billing/application/ports/orders.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { Trials } from "#billing/application/ports/trials.ts";
import { Withdrawals } from "#billing/application/ports/withdrawals.ts";
import { contractCutoff } from "#billing/domain/contract-retention.ts";
import { Order, OrderIdSchema } from "#billing/domain/order.ts";
import { SubscriptionChange } from "#billing/domain/subscription-change.ts";
import { DrizzleContractRecordsLive } from "#billing/infrastructure/drizzle-contract-records.ts";
import { DrizzleOrdersLive } from "#billing/infrastructure/drizzle-orders.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import { DrizzleTrialsLive } from "#billing/infrastructure/drizzle-trials.ts";
import { DrizzleWithdrawalsLive } from "#billing/infrastructure/drizzle-withdrawals.ts";
import { newId } from "#shared/application/ids.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import { subscriptionOf } from "#test/billing/support.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

const RecordsTest = Layer.mergeAll(
  DrizzleContractRecordsLive,
  DrizzleOrdersLive,
  DrizzleSubscriptionsLive,
  DrizzleTrialsLive,
  DrizzleWithdrawalsLive
).pipe(Layer.provideMerge(DatabaseTest));

const at = (iso: string) => DateTime.makeUnsafe(iso);

// A user id of the run: random, as Better Auth issues them.
const freshUser = freshWorkspace.pipe(
  Effect.map((id) => UserIdSchema.make(id))
);

const freshSubscription = newId(OrderIdSchema).pipe(
  Effect.map((id) => `sub_${id}`)
);

layer(RecordsTest, { timeout: 60_000 })(
  "billing's records in Postgres",
  (it) => {
    it.effect("give an order to one checkout, for its claim, while fresh", () =>
      Effect.gen(function* orders() {
        const store = yield* Orders;
        const workspaceId = yield* freshWorkspace;
        const userId = yield* freshUser;

        const order = new Order({
          consentVersion: "2026-11-09",
          createdAt: at("2026-11-09T10:00:00Z"),
          id: yield* newId(OrderIdSchema),
          interval: "year",
          plan: "business",
          trial: false,
          userId,
          workspaceId,
        });

        yield* store.place(order);

        const claim = {
          id: order.id,
          interval: "year",
          plan: "business",
          userId,
          workspaceId,
        } as const;

        const now = at("2026-11-09T10:05:00Z");

        assert.isTrue(
          Option.isNone(
            yield* store.take(
              { ...claim, plan: "pro" },
              at("2026-11-09T09:40:00Z"),
              now
            )
          )
        );
        assert.isTrue(
          Option.isNone(
            yield* store.take(claim, at("2026-11-09T10:01:00Z"), now)
          )
        );

        const taken = yield* store.take(claim, at("2026-11-09T09:40:00Z"), now);

        assert.deepStrictEqual(
          taken.pipe(Option.map(({ id }) => id)),
          Option.some(order.id)
        );
        assert.isTrue(
          Option.isNone(
            yield* store.take(claim, at("2026-11-09T09:40:00Z"), now)
          )
        );
      })
    );

    it.effect("record one trial per account and per workspace", () =>
      Effect.gen(function* trials() {
        const store = yield* Trials;
        const workspaceId = yield* freshWorkspace;
        const userId = yield* freshUser;
        const otherWorkspace = yield* freshWorkspace;
        const otherUser = yield* freshUser;
        const since = at("2026-11-09T09:00:00Z");

        assert.isFalse(yield* store.used(userId, workspaceId, since));

        assert.isTrue(
          yield* store.record({
            plan: "pro",
            startedAt: at("2026-11-09T10:00:00Z"),
            stripeSubscriptionId: yield* freshSubscription,
            userId,
            workspaceId,
          })
        );

        // A second one of the same account, elsewhere, is not recorded:
        // it duplicates the first.
        assert.isFalse(
          yield* store.record({
            plan: "pro",
            startedAt: at("2026-11-10T10:00:00Z"),
            stripeSubscriptionId: yield* freshSubscription,
            userId,
            workspaceId: otherWorkspace,
          })
        );

        assert.isTrue(yield* store.used(userId, otherWorkspace, since));
        assert.isTrue(yield* store.used(otherUser, workspaceId, since));
        assert.isFalse(yield* store.used(otherUser, otherWorkspace, since));
      })
    );

    it.effect(
      "hold the trial for one checkout at a time, until the hold runs out",
      () =>
        Effect.gen(function* holds() {
          const store = yield* Trials;
          const workspaceId = yield* freshWorkspace;
          const otherWorkspace = yield* freshWorkspace;
          const userId = yield* freshUser;
          const now = at("2026-11-09T10:00:00Z");
          const since = at("2026-11-09T09:00:00Z");

          assert.isTrue(yield* store.reserve(userId, workspaceId, now, since));

          // The same account, for another workspace, while the hold runs.
          assert.isFalse(
            yield* store.reserve(userId, otherWorkspace, now, since)
          );
          assert.isTrue(yield* store.used(userId, otherWorkspace, since));

          // A new checkout of the same account and workspace replaces it.
          assert.isFalse(yield* store.used(userId, workspaceId, since));
          assert.isTrue(yield* store.reserve(userId, workspaceId, now, since));

          // An hour later, a hold no subscription took holds nothing.
          const later = at("2026-11-09T11:30:00Z");
          const laterSince = at("2026-11-09T10:30:00Z");

          assert.isFalse(yield* store.used(userId, otherWorkspace, laterSince));
          assert.isTrue(
            yield* store.reserve(userId, otherWorkspace, later, laterSince)
          );

          // The trial the hold's checkout started takes it.
          assert.isTrue(
            yield* store.record({
              plan: "pro",
              startedAt: later,
              stripeSubscriptionId: yield* freshSubscription,
              userId,
              workspaceId: otherWorkspace,
            })
          );
          assert.isTrue(
            yield* store.used(userId, workspaceId, at("2027-01-01T00:00:00Z"))
          );
        })
    );

    it.effect(
      "keep a withdrawal as first recorded, so one tried again refunds the same",
      () =>
        Effect.gen(function* withdrawals() {
          const store = yield* Withdrawals;
          const stripeSubscriptionId = yield* freshSubscription;

          const first = {
            refunded: { amount: 810, currency: "eur" },
            requestedAt: at("2026-11-04T00:00:00Z"),
            stripeSubscriptionId,
            userId: yield* freshUser,
            workspaceId: yield* freshWorkspace,
          };

          assert.deepStrictEqual(yield* store.record(first), first);

          const again = yield* store.record({
            ...first,
            refunded: { amount: 790, currency: "eur" },
            requestedAt: at("2026-11-04T01:00:00Z"),
          });

          assert.deepStrictEqual(again, first);
        })
    );

    it.effect(
      "erase a workspace's orders no contract followed, keeping its trial for the account, and forget a user",
      () =>
        Effect.gen(function* erasure() {
          const sql = yield* SqlClient.SqlClient;
          const subscriptions = yield* Subscriptions;
          const workspaceId = yield* freshWorkspace;
          const userId = yield* freshUser;

          yield* (yield* Orders).place(
            new Order({
              consentVersion: "2026-11-09",
              createdAt: at("2026-11-09T10:00:00Z"),
              id: yield* newId(OrderIdSchema),
              interval: "month",
              plan: "pro",
              trial: true,
              userId,
              workspaceId,
            })
          );

          yield* (yield* Trials).record({
            plan: "pro",
            startedAt: at("2026-11-09T10:00:00Z"),
            stripeSubscriptionId: yield* freshSubscription,
            userId,
            workspaceId,
          });

          yield* (yield* Withdrawals).record({
            refunded: { amount: 0, currency: "eur" },
            requestedAt: at("2026-11-10T10:00:00Z"),
            stripeSubscriptionId: yield* freshSubscription,
            userId,
            workspaceId,
          });

          yield* subscriptions.eraseWorkspace(workspaceId);

          assert.deepStrictEqual(
            yield* sql`SELECT
            (SELECT count(*)::int FROM billing.orders WHERE workspace_id = ${workspaceId}) AS orders,
            (SELECT count(*)::int FROM billing.withdrawals WHERE workspace_id = ${workspaceId}) AS withdrawals,
            (SELECT count(*)::int FROM billing.trials WHERE workspace_id = ${workspaceId}) AS "workspaceTrials",
            (SELECT count(*)::int FROM billing.trials WHERE user_id = ${userId}) AS "userTrials"`,
            [{ orders: 0, userTrials: 1, withdrawals: 0, workspaceTrials: 0 }]
          );

          // Neither the workspace nor the user left: nothing names anyone.
          yield* subscriptions.forgetUser(userId, "pseudonym:synthetic");

          assert.deepStrictEqual(
            yield* sql`SELECT count(*)::int AS count FROM billing.trials WHERE user_id = ${userId}`,
            [{ count: 0 }]
          );
        })
    );
    it.effect(
      "keep the orders and withdrawals of an erased workspace's contract for 5 years, in its member's export, then purge them",
      () =>
        Effect.gen(function* kept() {
          const sql = yield* SqlClient.SqlClient;
          const subscriptions = yield* Subscriptions;
          const contracts = yield* ContractRecords;
          const workspaceId = yield* freshWorkspace;
          const userId = yield* freshUser;
          const stripeSubscriptionId = yield* freshSubscription;

          yield* subscriptions.record(
            new SubscriptionChange({
              eventId: `evt_${stripeSubscriptionId}`,
              occurredAt: at("2026-11-01T00:00:00Z"),
              subscription: subscriptionOf({
                plan: "starter",
                status: "canceled",
                stripeCustomerId: `cus_${stripeSubscriptionId}`,
                stripeSubscriptionId,
                workspaceId,
              }),
            })
          );

          yield* (yield* Orders).place(
            new Order({
              consentVersion: "2026-11-09",
              createdAt: at("2026-11-01T00:00:00Z"),
              id: yield* newId(OrderIdSchema),
              interval: "month",
              plan: "starter",
              trial: false,
              userId,
              workspaceId,
            })
          );

          yield* (yield* Withdrawals).record({
            refunded: { amount: 810, currency: "eur" },
            requestedAt: at("2026-11-04T00:00:00Z"),
            stripeSubscriptionId,
            userId,
            workspaceId,
          });

          yield* subscriptions.eraseWorkspace(workspaceId);

          // Kept without the workspace, by the customer that has the
          // invoices, and still the user's.
          assert.deepStrictEqual(
            yield* sql`SELECT stripe_customer_id AS customer, workspace_id AS workspace, erased_at IS NOT NULL AS erased FROM billing.orders WHERE user_id = ${userId}`,
            [
              {
                customer: `cus_${stripeSubscriptionId}`,
                erased: true,
                workspace: null,
              },
            ]
          );

          const exported = yield* contracts.ofUser(userId);

          assert.deepStrictEqual(
            exported.orders.map(({ consentVersion, workspaceId: still }) => ({
              consentVersion,
              still,
            })),
            [{ consentVersion: "2026-11-09", still: Option.none() }]
          );
          assert.deepStrictEqual(
            exported.withdrawals.map(({ refunded }) => refunded),
            [{ amount: 810, currency: "eur" }]
          );

          // Not yet 5 years.
          const now = yield* DateTime.now;

          yield* contracts.purge(contractCutoff(now));

          assert.strictEqual(
            (yield* contracts.ofUser(userId)).orders.length,
            1
          );

          yield* contracts.purge(DateTime.add(now, { minutes: 1 }));

          assert.deepStrictEqual(yield* contracts.ofUser(userId), {
            orders: [],
            withdrawals: [],
          });
        })
    );
  }
);
