// Handing a workspace to another payer, on Postgres: the payer offers it
// to another owner in person, who takes it within 7 days into their own
// billing account, never above what that account's plan holds, never
// with a subscription that may still bill; offers that cross take turns.
import { assert, layer } from "@effect/vitest";
import { Duration, Effect, Layer, Option } from "effect";
import { TestClock } from "effect/testing";

import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { AccountChannels } from "#billing/application/ports/account-channels.ts";
import { BillingAccountStore } from "#billing/application/ports/billing-account-store.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { TransferWorkspace } from "#billing/application/transfer-workspace.ts";
import { PersonRequired } from "#billing/domain/person-required.ts";
import { TransferNotFound } from "#billing/domain/transfer-not-found.ts";
import { TransferRefused } from "#billing/domain/transfer-refused.ts";
import { DrizzleBillingAccountStoreLive } from "#billing/infrastructure/drizzle-billing-account-store.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import { WorkspaceAccountPayersLive } from "#billing/infrastructure/workspace-account-payers.ts";
import { Actor } from "#shared/domain/access.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import {
  accountsTest,
  cleanUpAccounts,
  person,
  subscribe,
  workspaceOwnedBy,
} from "#test/billing/support.ts";
import {
  PartnerOwnershipLive,
  WorkspaceOwnersLive,
} from "#workspace/container.ts";

// Each workspace's own channels, as the tests say it holds them.
const held = new Map<WorkspaceId, number>();

const ChannelsCountedTest = Layer.succeed(
  AccountChannels,
  AccountChannels.of({
    ownIn: (workspaceIds) =>
      Effect.succeed(
        new Map(
          workspaceIds.flatMap((id) => {
            const count = held.get(id);

            return count === undefined ? [] : [[id, count] as const];
          })
        )
      ),
    sharedPage: () => Effect.succeed([]),
  })
);

const TransferTest = TransferWorkspace.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleBillingAccountStoreLive,
      WorkspaceAccountPayersLive.pipe(
        Layer.provide(Layer.merge(PartnerOwnershipLive, WorkspaceOwnersLive))
      ),
      DrizzleSubscriptionsLive,
      ChannelsCountedTest,
      Layer.succeed(
        BillingMode,
        BillingMode.of({ enabled: true, graceUntil: Option.none() })
      )
    )
  ),
  Layer.provideMerge(accountsTest)
);

// The free plan's channels.
const freeChannels = 2;

/** The person, as an owner of the workspace in their own session. */
const ownerIn = (workspaceId: WorkspaceId, userId: UserId) =>
  new Actor({
    permissions: ["billing:manage"],
    subject: { _tag: "user", impersonatedBy: Option.none(), userId },
    workspaceId,
  });

// Channels the workspace holds, counted by the stand-in above.
const holding = (workspaceId: WorkspaceId, count: number) =>
  Effect.sync(() => {
    held.set(workspaceId, count);
  });

const cleanUp = (workspaceIds: readonly WorkspaceId[]) =>
  Effect.sync(() => {
    for (const id of workspaceIds) {
      held.delete(id);
    }
  }).pipe(Effect.andThen(cleanUpAccounts(workspaceIds)));

layer(TransferTest)("handing a workspace to another payer", (it) => {
  it.effect("moves it to the other owner's account once they accept", () =>
    Effect.gen(function* moved() {
      const transfers = yield* TransferWorkspace;
      const accounts = yield* BillingAccounts;
      const store = yield* BillingAccountStore;
      const payer = yield* person;
      const other = yield* person;
      const kept = yield* workspaceOwnedBy([payer]);
      const handed = yield* workspaceOwnedBy([payer, other]);

      yield* holding(handed, 1);

      const before = yield* accounts.of(handed);

      assert.strictEqual(before.holder, kept);

      const offered = yield* transfers.offer(ownerIn(handed, payer), other);

      assert.strictEqual(offered.toUserId, other);
      assert.strictEqual(offered.fromAccountId, before.id);

      const taken = yield* transfers.accept(ownerIn(handed, other));

      assert.deepStrictEqual(taken.payer, Option.some(other));
      assert.strictEqual(taken.holder, handed);
      assert.strictEqual((yield* accounts.of(handed)).id, taken.id);
      assert.deepStrictEqual((yield* accounts.poolOf(kept)).others, []);
      assert.isTrue(Option.isNone(yield* store.transferOf(handed)));

      yield* cleanUp([kept, handed]);
    })
  );

  it.effect("lapses after 7 days", () =>
    Effect.gen(function* lapsed() {
      const transfers = yield* TransferWorkspace;
      const payer = yield* person;
      const other = yield* person;
      const handed = yield* workspaceOwnedBy([payer, other]);

      yield* transfers.offer(ownerIn(handed, payer), other);
      yield* TestClock.adjust(Duration.days(7));

      assert.deepStrictEqual(
        yield* transfers.accept(ownerIn(handed, other)).pipe(Effect.flip),
        new TransferNotFound()
      );

      yield* cleanUp([handed]);
    })
  );

  it.effect("can be withdrawn by its payer, or declined", () =>
    Effect.gen(function* withdrawn() {
      const transfers = yield* TransferWorkspace;
      const payer = yield* person;
      const other = yield* person;
      const handed = yield* workspaceOwnedBy([payer, other]);

      yield* transfers.offer(ownerIn(handed, payer), other);
      yield* transfers.withdraw(ownerIn(handed, payer));

      assert.deepStrictEqual(
        yield* transfers.accept(ownerIn(handed, other)).pipe(Effect.flip),
        new TransferNotFound()
      );

      yield* transfers.offer(ownerIn(handed, payer), other);
      yield* transfers.withdraw(ownerIn(handed, other));

      assert.deepStrictEqual(
        yield* transfers.withdraw(ownerIn(handed, payer)).pipe(Effect.flip),
        new TransferNotFound()
      );

      yield* cleanUp([handed]);
    })
  );

  it.effect(
    "is refused into an account whose plan has no room for its channels",
    () =>
      Effect.gen(function* full() {
        const transfers = yield* TransferWorkspace;
        const accounts = yield* BillingAccounts;
        const payer = yield* person;
        const other = yield* person;
        const theirs = yield* workspaceOwnedBy([other]);
        const handed = yield* workspaceOwnedBy([payer, other]);

        yield* holding(theirs, freeChannels);
        yield* holding(handed, 1);
        yield* accounts.of(theirs);

        yield* transfers.offer(ownerIn(handed, payer), other);

        assert.deepStrictEqual(
          yield* transfers.accept(ownerIn(handed, other)).pipe(Effect.flip),
          new PlanLimitReached({
            allowed: freeChannels,
            limit: "channels",
            needed: freeChannels + 1,
            used: freeChannels,
          })
        );

        assert.deepStrictEqual(
          (yield* accounts.of(handed)).payer,
          Option.some(payer)
        );

        yield* cleanUp([theirs, handed]);
      })
  );

  it.effect(
    "is refused for a billing workspace whose subscription may still bill",
    () =>
      Effect.gen(function* subscribed() {
        const transfers = yield* TransferWorkspace;
        const payer = yield* person;
        const other = yield* person;
        const handed = yield* workspaceOwnedBy([payer, other]);

        yield* subscribe(handed, "active");

        assert.deepStrictEqual(
          yield* transfers
            .offer(ownerIn(handed, payer), other)
            .pipe(Effect.flip),
          new TransferRefused({ reason: "subscribed" })
        );

        yield* cleanUp([handed]);
      })
  );

  it.effect("is offered by the payer in person only, to another owner", () =>
    Effect.gen(function* inPerson() {
      const transfers = yield* TransferWorkspace;
      const payer = yield* person;
      const other = yield* person;
      const stranger = yield* person;
      const handed = yield* workspaceOwnedBy([payer, other]);

      const impersonated = new Actor({
        permissions: ["billing:manage"],
        subject: {
          _tag: "user",
          impersonatedBy: Option.some(stranger),
          userId: payer,
        },
        workspaceId: handed,
      });

      assert.deepStrictEqual(
        yield* transfers.offer(impersonated, other).pipe(Effect.flip),
        new PersonRequired()
      );

      assert.deepStrictEqual(
        yield* transfers.offer(ownerIn(handed, other), payer).pipe(Effect.flip),
        new TransferRefused({ reason: "notPayer" })
      );

      assert.deepStrictEqual(
        yield* transfers
          .offer(ownerIn(handed, payer), stranger)
          .pipe(Effect.flip),
        new TransferRefused({ reason: "notAnOwner" })
      );

      assert.deepStrictEqual(
        yield* transfers.offer(ownerIn(handed, payer), payer).pipe(Effect.flip),
        new TransferRefused({ reason: "samePayer" })
      );

      yield* cleanUp([handed]);
    })
  );

  it.effect("takes turns when two offers cross each other", () =>
    Effect.gen(function* crossing() {
      const transfers = yield* TransferWorkspace;
      const accounts = yield* BillingAccounts;
      const first = yield* person;
      const second = yield* person;
      const firstOwn = yield* workspaceOwnedBy([first]);
      const secondOwn = yield* workspaceOwnedBy([second]);
      const toSecond = yield* workspaceOwnedBy([first, second]);
      const toFirst = yield* workspaceOwnedBy([second, first]);

      yield* Effect.all([accounts.of(toSecond), accounts.of(toFirst)]);
      yield* transfers.offer(ownerIn(toSecond, first), second);
      yield* transfers.offer(ownerIn(toFirst, second), first);

      yield* Effect.all(
        [
          transfers.accept(ownerIn(toSecond, second)),
          transfers.accept(ownerIn(toFirst, first)),
        ],
        { concurrency: 2 }
      );

      const [ofFirst, ofSecond] = yield* Effect.all([
        accounts.of(firstOwn),
        accounts.of(secondOwn),
      ]);

      assert.strictEqual((yield* accounts.of(toFirst)).id, ofFirst.id);
      assert.strictEqual((yield* accounts.of(toSecond)).id, ofSecond.id);
      assert.deepStrictEqual((yield* accounts.poolOf(firstOwn)).others, [
        toFirst,
      ]);
      assert.deepStrictEqual((yield* accounts.poolOf(secondOwn)).others, [
        toSecond,
      ]);

      yield* cleanUp([firstOwn, secondOwn, toSecond, toFirst]);
    })
  );
});
