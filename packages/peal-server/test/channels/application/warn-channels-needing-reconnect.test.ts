import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { WarnChannelsNeedingReconnect } from "#channels/application/warn-channels-needing-reconnect.ts";
import { markRefreshNeeded } from "#channels/domain/channel.ts";
import type { Channel, TokenLifetime } from "#channels/domain/channel.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  RecordedNotices,
  repositoryScopedTo,
  syntheticCredentials,
} from "#test/channels/support.ts";

const FileTest = Layer.mergeAll(
  DrizzleChannelRepository,
  SqlChannelLocks,
  RecordedNotices.layer
).pipe(Layer.provideMerge(DatabaseTest));

// The daily check over the workspace's channels only.
const runIn = (workspaceId: WorkspaceId) =>
  WarnChannelsNeedingReconnect.use((warnings) => warnings.run).pipe(
    Effect.provide(
      Layer.fresh(WarnChannelsNeedingReconnect.layer).pipe(
        Layer.provide(repositoryScopedTo(workspaceId))
      )
    )
  );

const stored = Effect.fn("stored")(function* stored(
  workspaceId: WorkspaceId,
  token: TokenLifetime
) {
  const channel = yield* freshChannel(workspaceId, {
    platform: "linkedin",
    token,
  });

  yield* ChannelRepository.use((channels) =>
    channels.insert(channel, syntheticCredentials(channel))
  );

  return channel;
});

const reread = (channel: Channel) =>
  ChannelRepository.use((channels) => channels.get(channel.id)).pipe(
    Effect.map(Option.getOrThrow)
  );

// A 60-day token issued `age` ago.
const issuedAgo = (now: DateTime.Utc, age: Duration.Input): TokenLifetime => {
  const issuedAt = DateTime.subtractDuration(
    now,
    Duration.fromInputUnsafe(age)
  );

  return {
    _tag: "nonRefreshable",
    expiresAt: DateTime.addDuration(issuedAt, Duration.days(60)),
    issuedAt,
  };
};

layer(FileTest)("warning about channels to reconnect", (it) => {
  it.effect("warns of a token about to expire, with its expiry", () =>
    Effect.gen(function* warnsSoon() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const soon = yield* stored(workspaceId, issuedAgo(now, "55 days"));

      yield* stored(workspaceId, issuedAgo(now, "40 days"));

      const report = yield* runIn(workspaceId);

      const notices = yield* RecordedNotices.use((recorded) =>
        recorded.of(workspaceId)
      );

      assert.deepStrictEqual(report, {
        expired: 0,
        reconnectRequired: 0,
        reconnectSoon: 1,
      });
      assert.deepStrictEqual(notices, [
        {
          channelId: soon.id,
          expiresAt: Option.some(DateTime.addDuration(now, Duration.days(5))),
          kind: "reconnectSoon",
        },
      ]);
      assert.deepStrictEqual((yield* reread(soon)).status, { _tag: "active" });
    })
  );

  it.effect("marks an expired token's channel and asks to reconnect it", () =>
    Effect.gen(function* expires() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const expired = yield* stored(workspaceId, issuedAgo(now, "61 days"));

      const report = yield* runIn(workspaceId);

      assert.strictEqual(report.expired, 1);
      assert.deepStrictEqual((yield* reread(expired)).status, {
        _tag: "refreshNeeded",
      });
      assert.deepStrictEqual(
        (yield* RecordedNotices.use((recorded) =>
          recorded.of(workspaceId)
        )).map(({ kind }) => kind),
        ["reconnectRequired"]
      );
    })
  );

  it.effect("asks again about channels already marked", () =>
    Effect.gen(function* marked() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const channel = yield* stored(workspaceId, { _tag: "nonExpiring" });

      yield* ChannelRepository.use((channels) =>
        channels.update(markRefreshNeeded(channel, now), Option.none())
      );

      const report = yield* runIn(workspaceId);

      // The notice goes out once per event: sending it again does nothing
      // unless it was never sent (see the channel notices).
      assert.strictEqual(report.reconnectRequired, 1);
    })
  );
});
