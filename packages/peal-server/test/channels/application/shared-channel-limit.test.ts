// A partner's workspaces hold their channels against one plan: the home
// workspace's, counted across all of them.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { ChannelEvents } from "#channels/application/channel-events.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleConnectAttempts } from "#channels/infrastructure/drizzle-connect-attempts.ts";
import { DrizzleConnectChoices } from "#channels/infrastructure/drizzle-connect-choices.ts";
import { SharedChannelAllowanceLive } from "#channels/infrastructure/plan-channel-allowance.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import { Ids } from "#shared/application/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import { everyWorkspaceOn } from "#test/billing/support.ts";
import {
  connectedChannel,
  MastodonAuthorizersTest,
  mastodonInstance,
} from "#test/channels/connect-support.ts";
import {
  actorIn,
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  OpenOutboundGuard,
  syntheticCredentials,
  TokenCipherTest,
} from "#test/channels/support.ts";
import { statementsOf } from "#test/shared/support.ts";
import { PartnerOwnershipLive } from "#workspace/container.ts";

// A partner account whose home workspace is the first, owning the others:
// rows as the workspace context keeps them, so the pool is held as the
// server holds it.
const share = Effect.fn("share")(function* share(
  home: WorkspaceId,
  owned: readonly WorkspaceId[]
) {
  const sql = yield* SqlClient.SqlClient;
  const partnerId = yield* Ids.use((ids) => ids.next);

  yield* sql`INSERT INTO workspace.partners (id, workspace_id, name, return_origins, created_at, updated_at)
    VALUES (${partnerId}, ${home}, 'Synthetic partner', '{}', now(), now())`;

  yield* Effect.forEach(
    owned,
    (workspaceId) =>
      sql`INSERT INTO workspace.partner_workspaces (workspace_id, partner_id, created_at)
        VALUES (${workspaceId}, ${partnerId}, now())`,
    { discard: true }
  );
});

// The free plan, which allows 2 accounts, shared as the partners' rows say.
const SharedFreePlanTest = Layer.mergeAll(
  ConnectChannel.layer,
  ChannelUsage.layer
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleChannelRepository,
      ChannelEvents.none,
      DrizzleConnectAttempts,
      DrizzleConnectChoices,
      SqlChannelLocks,
      SharedChannelAllowanceLive.pipe(
        Layer.provide(everyWorkspaceOn("free")),
        Layer.provide(PartnerOwnershipLive)
      ),
      MastodonAuthorizersTest.pipe(Layer.provide(OpenOutboundGuard))
    )
  ),
  Layer.provideMerge(TokenCipherTest),
  Layer.provideMerge(DatabaseTest)
);

const freeChannels = 2;

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

const callbackOf = (back: {
  readonly code?: string;
  readonly state: string;
}): AuthorizationCallback => ({
  code: Option.fromUndefinedOr(back.code),
  error: Option.none(),
  issuer: Option.none(),
  state: back.state,
});

const fill = Effect.fn("fill")(function* fill(
  workspaceId: WorkspaceId,
  count: number
) {
  const repository = yield* ChannelRepository;

  for (let added = 0; added < count; added += 1) {
    const channel = yield* freshChannel(workspaceId);

    yield* repository.insert(channel, syntheticCredentials(channel));
  }
});

layer(SharedFreePlanTest)("a partner's workspaces on one plan", (it) => {
  it.effect(
    "refuse a new account once the plan's channels are taken across them",
    () =>
      Effect.gen(function* full() {
        const instance = yield* mastodonInstance();
        const home = yield* freshWorkspace;
        const first = yield* freshWorkspace;
        const second = yield* freshWorkspace;
        const connect = yield* ConnectChannel;

        yield* share(home, [first, second]);
        yield* fill(home, 1);
        yield* fill(first, 1);

        // The third workspace has no channel, and no room: the free
        // tier's two are taken by the others.
        const refused = yield* connect
          .start(manager(second), "mastodon", {
            connection: Option.none(),
            handle: Option.none(),
            instance: Option.some(instance.url),
          })
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          refused,
          new PlanLimitReached({
            allowed: freeChannels,
            limit: "channels",
            needed: freeChannels + 1,
            used: freeChannels,
          })
        );

        // Each of them shows what the plan holds in all.
        const usage = yield* ChannelUsage;

        assert.deepStrictEqual(
          yield* Effect.all([
            usage.connected(home),
            usage.connected(first),
            usage.connected(second),
          ]),
          [freeChannels, freeChannels, freeChannels]
        );
        const own = yield* usage.connectedIn([home, first, second]);

        assert.deepStrictEqual(
          [own.get(home), own.get(first), own.get(second)],
          [1, 1, undefined]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "take the last channel once, when two of them connect at the same time",
    () =>
      Effect.gen(function* raced() {
        const instance = yield* mastodonInstance();
        const home = yield* freshWorkspace;
        const first = yield* freshWorkspace;
        const second = yield* freshWorkspace;
        const connect = yield* ConnectChannel;

        yield* share(home, [first, second]);
        yield* fill(home, freeChannels - 1);

        const begin = (workspaceId: WorkspaceId) =>
          connect.start(manager(workspaceId), "mastodon", {
            connection: Option.none(),
            handle: Option.none(),
            instance: Option.some(instance.url),
          });

        const complete = (workspaceId: WorkspaceId, authorizationUrl: string) =>
          connect
            .complete(
              manager(workspaceId),
              "mastodon",
              callbackOf(instance.approve(authorizationUrl))
            )
            .pipe(Effect.result);

        // Both started while one channel was left.
        const urls = yield* Effect.all([begin(first), begin(second)]);

        const ended = yield* Effect.all(
          [complete(first, urls[0]), complete(second, urls[1])],
          { concurrency: 2 }
        );

        assert.deepStrictEqual(ended.map(({ _tag }) => _tag).toSorted(), [
          "Failure",
          "Success",
        ]);

        const usage = yield* ChannelUsage;

        assert.strictEqual(yield* usage.connected(home), freeChannels);
      }).pipe(Effect.scoped)
  );

  it.effect("leave a workspace outside any pool its own three", () =>
    Effect.gen(function* alone() {
      const instance = yield* mastodonInstance();
      const home = yield* freshWorkspace;
      const owned = yield* freshWorkspace;
      const outside = yield* freshWorkspace;
      const connect = yield* ConnectChannel;

      yield* share(home, [owned]);
      yield* fill(home, 2);
      yield* fill(owned, 1);

      const authorizationUrl = yield* connect.start(
        manager(outside),
        "mastodon",
        {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.some(instance.url),
        }
      );

      const channel = yield* connectedChannel(
        yield* connect.complete(
          manager(outside),
          "mastodon",
          callbackOf(instance.approve(authorizationUrl))
        )
      );

      assert.strictEqual(channel.workspaceId, outside);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "count several workspaces' pools at once as each one's, each pool once, holding none",
    () =>
      Effect.gen(function* across() {
        const usage = yield* ChannelUsage;
        const home = yield* freshWorkspace;
        const owned = yield* freshWorkspace;
        const unlisted = yield* freshWorkspace;
        const outside = yield* freshWorkspace;
        const empty = yield* freshWorkspace;

        yield* share(home, [owned, unlisted]);
        yield* fill(home, 1);
        yield* fill(owned, 1);
        yield* fill(unlisted, 2);
        yield* fill(outside, 2);

        const ids = [home, owned, outside, empty];

        const { result, statements } = yield* statementsOf(
          usage.connectedAcross(ids)
        );

        for (const id of ids) {
          assert.strictEqual(result.get(id), yield* usage.connected(id));
        }

        assert.deepStrictEqual(
          ids.map((id) => result.get(id)),
          [4, 4, 2, 0]
        );
        // The pools (owners, homes, their members) and one count; no lock.
        assert.strictEqual(statements, 4);
        assert.deepStrictEqual(yield* statementsOf(usage.connectedAcross([])), {
          result: new Map(),
          statements: 0,
        });
      })
  );
});
