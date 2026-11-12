import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { ChannelCredentials } from "#channels/application/channel-credentials.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import {
  disable,
  markRefreshNeeded,
  reconnect,
} from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  later,
  pastParameterLimit,
  refreshable,
  syntheticCredentials,
} from "#test/channels/support.ts";

const RepositoryTest = DrizzleChannelRepository.pipe(
  Layer.provideMerge(DatabaseTest)
);

// The key id column of the channel's row.
const storedKeyId = Effect.fn("storedKeyId")(function* storedKeyId(
  channel: Channel
) {
  const sql = yield* SqlClient.SqlClient;

  const rows = yield* sql<{
    readonly tokenKeyId: string;
  }>`SELECT token_key_id AS "tokenKeyId" FROM channels.channels WHERE id = ${channel.id}`;

  return rows[0]?.tokenKeyId;
});

layer(RepositoryTest)("the Drizzle channel repository", (it) => {
  it.effect("keeps every status, token lifetime and profile", () =>
    Effect.gen(function* roundTrips() {
      const channels = yield* ChannelRepository;
      const channel = yield* freshChannel(yield* freshWorkspace);

      yield* channels.insert(channel, syntheticCredentials(channel));

      const found = () => channels.findById(channel.workspaceId, channel.id);

      assert.deepStrictEqual(yield* found(), Option.some(channel));

      const broken = markRefreshNeeded(channel, later);
      const disabledBroken = disable(broken, later);

      const reconnected = reconnect(
        disabledBroken,
        {
          avatarUrl: Option.none(),
          connection: Option.none(),
          displayName: Option.none(),
          handle: "@peal_renamed",
          scopes: [],
          token: refreshable,
        },
        later
      );

      const nonExpiring = reconnect(
        reconnected,
        {
          avatarUrl: channel.avatarUrl,
          connection: channel.connection,
          displayName: channel.displayName,
          handle: channel.handle,
          scopes: ["read"],
          token: { _tag: "nonExpiring" },
        },
        later
      );

      for (const version of [
        broken,
        disabledBroken,
        reconnected,
        nonExpiring,
      ]) {
        assert.isTrue(yield* channels.update(version, Option.none()));
        assert.deepStrictEqual(yield* found(), Option.some(version));
      }
    })
  );

  it.effect("lists a workspace's channels oldest first, and no other's", () =>
    Effect.gen(function* lists() {
      const channels = yield* ChannelRepository;
      const workspaceId = yield* freshWorkspace;
      const first = yield* freshChannel(workspaceId);
      const second = yield* freshChannel(workspaceId, { platform: "bluesky" });
      const elsewhere = yield* freshChannel(yield* freshWorkspace);

      for (const channel of [second, elsewhere, first]) {
        yield* channels.insert(channel, syntheticCredentials(channel));
      }

      assert.deepStrictEqual(yield* channels.list(workspaceId), [
        first,
        second,
      ]);
      assert.deepStrictEqual(yield* channels.list(yield* freshWorkspace), []);
    })
  );

  it.effect("finds a workspace's channel by its platform account", () =>
    Effect.gen(function* byAccount() {
      const channels = yield* ChannelRepository;
      const channel = yield* freshChannel(yield* freshWorkspace);

      yield* channels.insert(channel, syntheticCredentials(channel));

      assert.deepStrictEqual(
        yield* channels.findByAccount(
          channel.workspaceId,
          channel.platform,
          channel.accountId
        ),
        Option.some(channel)
      );
      assert.deepStrictEqual(
        yield* channels.findByAccount(
          channel.workspaceId,
          "bluesky",
          channel.accountId
        ),
        Option.none()
      );
      assert.deepStrictEqual(
        yield* channels.findByAccount(
          yield* freshWorkspace,
          channel.platform,
          channel.accountId
        ),
        Option.none()
      );
    })
  );

  it.effect("connects an account once per workspace", () =>
    Effect.gen(function* oncePerWorkspace() {
      const channels = yield* ChannelRepository;
      const workspaceId = yield* freshWorkspace;
      const channel = yield* freshChannel(workspaceId, { accountId: "42" });
      const again = yield* freshChannel(workspaceId, { accountId: "42" });

      yield* channels.insert(channel, syntheticCredentials(channel));

      const error = yield* Effect.flip(
        channels.insert(again, syntheticCredentials(again))
      );

      assert.deepInclude(error, {
        _tag: "ChannelAlreadyConnected",
        accountId: "42",
        platform: "mastodon",
      });
      assert.deepStrictEqual(yield* channels.list(workspaceId), [channel]);

      // Another workspace may connect the same account.
      const elsewhere = yield* freshChannel(yield* freshWorkspace, {
        accountId: "42",
      });

      yield* channels.insert(elsewhere, syntheticCredentials(elsewhere));

      assert.deepStrictEqual(
        yield* channels.findById(elsewhere.workspaceId, elsewhere.id),
        Option.some(elsewhere)
      );
    })
  );

  it.effect("replaces the tokens only when new ones are given", () =>
    Effect.gen(function* credentials() {
      const channels = yield* ChannelRepository;
      const channel = yield* freshChannel(yield* freshWorkspace);
      const stored = syntheticCredentials(channel);

      yield* channels.insert(channel, stored);

      assert.deepStrictEqual(
        yield* channels.credentials(channel.id),
        Option.some(stored)
      );
      assert.strictEqual(yield* storedKeyId(channel), "k1");

      yield* channels.update(markRefreshNeeded(channel, later), Option.none());

      assert.deepStrictEqual(
        yield* channels.credentials(channel.id),
        Option.some(stored)
      );

      const rotated = syntheticCredentials(channel, {
        keyId: "k2",
        refresh: false,
      });

      yield* channels.update(channel, Option.some(rotated));

      assert.deepStrictEqual(
        yield* channels.credentials(channel.id),
        Option.some(rotated)
      );
      assert.strictEqual(yield* storedKeyId(channel), "k2");
    })
  );

  it.effect("refuses tokens encrypted with two different keys", () =>
    Effect.gen(function* mixedKeys() {
      const channels = yield* ChannelRepository;
      const channel = yield* freshChannel(yield* freshWorkspace);
      const k1 = syntheticCredentials(channel);
      const k2 = syntheticCredentials(channel, { keyId: "k2" });

      const error = yield* Effect.flip(
        channels.insert(
          channel,
          new ChannelCredentials({
            accessToken: k1.accessToken,
            refreshToken: k2.refreshToken,
          })
        )
      );

      assert.strictEqual(error._tag, "DatabaseError");
      assert.deepStrictEqual(
        yield* channels.findById(channel.workspaceId, channel.id),
        Option.none()
      );
    })
  );

  it.effect("says whether the channel to change or delete was there", () =>
    Effect.gen(function* missing() {
      const channels = yield* ChannelRepository;
      const channel = yield* freshChannel(yield* freshWorkspace);

      assert.isFalse(yield* channels.update(channel, Option.none()));
      assert.isFalse(yield* channels.remove(channel.workspaceId, channel.id));

      yield* channels.insert(channel, syntheticCredentials(channel));

      assert.isTrue(yield* channels.remove(channel.workspaceId, channel.id));
      assert.isFalse(yield* channels.remove(channel.workspaceId, channel.id));
      assert.deepStrictEqual(
        yield* channels.findById(channel.workspaceId, channel.id),
        Option.none()
      );
      assert.deepStrictEqual(
        yield* channels.credentials(channel.id),
        Option.none()
      );
    })
  );

  it.effect("never reaches another workspace's channel", () =>
    Effect.gen(function* otherWorkspace() {
      const channels = yield* ChannelRepository;
      const channel = yield* freshChannel(yield* freshWorkspace);
      const outsider = yield* freshWorkspace;

      yield* channels.insert(channel, syntheticCredentials(channel));

      assert.deepStrictEqual(
        yield* channels.findById(outsider, channel.id),
        Option.none()
      );
      assert.isFalse(yield* channels.remove(outsider, channel.id));
      assert.deepStrictEqual(
        yield* channels.findById(channel.workspaceId, channel.id),
        Option.some(channel)
      );
    })
  );

  it.effect(
    "counts the channels of more workspaces than a statement takes parameters",
    () =>
      Effect.gen(function* many() {
        const channels = yield* ChannelRepository;
        const channel = yield* freshChannel(yield* freshWorkspace);

        yield* channels.insert(channel, syntheticCredentials(channel));

        const counted = yield* channels.countIn(
          pastParameterLimit([channel.workspaceId])
        );

        assert.strictEqual(counted.get(channel.workspaceId), 1);
        assert.strictEqual(counted.size, 1);
      })
  );
});
