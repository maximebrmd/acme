import { randomUUID } from "node:crypto";

// An erasure and a platform's deletion request take the spending lock of
// each ad account they remove, as asking for a boost and its last check
// before it runs do: neither can remove an account in the middle of one.
import { assert, layer } from "@effect/vitest";
import { Deferred, Duration, Effect, Fiber, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { AdRecords } from "#ads/application/ad-records.ts";
import { AccountStore } from "#ads/application/ports/account-store.ts";
import { AdAccountIdSchema } from "#ads/domain/ids.ts";
import { AdsPlatformUserGrants } from "#ads/infrastructure/ads-platform-user-grants.ts";
import { DrizzleAdRecords } from "#ads/infrastructure/drizzle-ad-records.ts";
import { PlatformUserGrants } from "#channels/application/platform-user-grants.ts";
import {
  AdsTest,
  connectedAccount,
  freshOwner,
  onMeta,
} from "#test/ads/support.ts";

const Test = Layer.mergeAll(DrizzleAdRecords, AdsPlatformUserGrants).pipe(
  Layer.provideMerge(AdsTest)
);

// Whether `waiting` is still waiting a moment after it started, while the
// account's spending lock is held, and done once it is let go.
const heldBack = <A, E>(
  accountId: Parameters<typeof AccountStore.Service.spendingOn>[0],
  waiting: Effect.Effect<A, E>
) =>
  Effect.gen(function* holding() {
    const accounts = yield* AccountStore;
    const taken = yield* Deferred.make<boolean>();
    const release = yield* Deferred.make<boolean>();

    const holder = yield* accounts
      .spendingOn(
        accountId,
        Deferred.succeed(taken, true).pipe(
          Effect.andThen(Deferred.await(release))
        )
      )
      .pipe(Effect.forkChild);

    yield* Deferred.await(taken);

    const waiter = yield* waiting.pipe(Effect.forkChild);

    yield* Effect.sleep(Duration.millis(300));

    const early = waiter.pollUnsafe();

    yield* Deferred.succeed(release, true);
    yield* Fiber.join(holder);
    yield* Fiber.join(waiter);

    return early === undefined;
  });

// A random UUID with the version digit of v7.
const uuid7 = () => {
  const random = randomUUID();

  return `${random.slice(0, 14)}7${random.slice(15)}`;
};

layer(Test, { excludeTestServices: true })("the ads' spending locks", (it) => {
  it.effect("hold back a workspace's erasure while a boost is counted", () =>
    Effect.gen(function* erasure() {
      yield* onMeta();
      const owner = yield* freshOwner;
      const account = yield* connectedAccount(owner);
      const records = yield* AdRecords;
      const client = yield* SqlClient.SqlClient;

      assert.isTrue(
        yield* heldBack(
          account.id,
          client.withTransaction(records.ensureErasable(owner.workspaceId))
        )
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "hold back a platform's deletion request while a boost is counted",
    () =>
      Effect.gen(function* deletion() {
        const owner = yield* freshOwner;
        const client = yield* SqlClient.SqlClient;
        const grants = yield* PlatformUserGrants;

        // A Meta user of this test's own: the request deletes every
        // sign-in of theirs, in any workspace.
        const userId = `1022${String(Date.now()).slice(-12)}`;
        const grantId = uuid7();
        const accountId = AdAccountIdSchema.make(uuid7());

        yield* client`INSERT INTO ads.grants (id, workspace_id, network, platform_user_id, token, token_key_id, scopes, access, created_at, updated_at)
          VALUES (${grantId}, ${owner.workspaceId}, 'meta', ${userId}, 'synthetic.iv.ciphertext', 'synthetic', ARRAY['ads_read'], 'working', now(), now())`;
        yield* client`INSERT INTO ads.accounts (id, workspace_id, grant_id, network, external_id, name, currency, time_zone, status, connected_at, next_sync_at, spending_enabled)
          VALUES (${accountId}, ${owner.workspaceId}, ${grantId}, 'meta', '1001', 'Synthetic account', 'EUR', 'Europe/Paris', 'active', now(), now() + interval '1 day', false)`;

        assert.isTrue(
          yield* heldBack(accountId, grants.erase("facebook", userId))
        );
      })
  );
});
