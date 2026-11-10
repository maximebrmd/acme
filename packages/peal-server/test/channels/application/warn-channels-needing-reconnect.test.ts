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

  it.effect(
    "warns about every channel, however many there are and were warned before",
    () =>
      Effect.gen(function* everyChannel() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;

        // More than a run used to take, all within their last week, and
        // some expired: a run that stopped at its first thousand would
        // list the same thousand again the next day.
        const expiring = 1300;
        const expired = 200;

        yield* Effect.forEach(
          Array.from({ length: expiring }, (_, index) => index),
          (index) =>
            stored(
              workspaceId,
              issuedAgo(now, Duration.days(54 + (index % 6)))
            ),
          { concurrency: 8 }
        );

        yield* Effect.forEach(
          Array.from({ length: expired }, (_, index) => index),
          () => stored(workspaceId, issuedAgo(now, "61 days")),
          { concurrency: 8 }
        );

        const report = yield* runIn(workspaceId);

        // Each once: an expired channel is marked, and not told again when
        // the run reaches the marked ones.
        assert.deepStrictEqual(report, {
          expired,
          reconnectRequired: 0,
          reconnectSoon: expiring,
        });

        const notices = yield* RecordedNotices.use((recorded) =>
          recorded.of(workspaceId)
        );

        assert.lengthOf(notices, expiring + expired);
        assert.lengthOf(
          new Set(notices.map(({ channelId }) => channelId)),
          expiring + expired
        );
      }),
    120_000
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
