import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { ChannelOverview } from "#channels/application/channel-overview.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { disable, markRefreshNeeded } from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { DrizzleChannelOverviewReads } from "#channels/infrastructure/drizzle-channel-overview-reads.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  later,
  syntheticCredentials,
} from "#test/channels/support.ts";

// The channels of several workspaces at once, in Postgres, for the view
// across a person's workspaces. Each test's workspaces are its own, and
// their channels deleted after.

const OverviewTest = ChannelOverview.layer.pipe(
  Layer.provide(DrizzleChannelOverviewReads),
  Layer.provideMerge(DrizzleChannelRepository),
  Layer.provideMerge(DatabaseTest)
);

const kept = Effect.fn("test.kept")(function* kept(channel: Channel) {
  const repository = yield* ChannelRepository;

  yield* repository.insert(channel, syntheticCredentials(channel));

  return channel;
});

const deleteIn = (workspaceIds: readonly WorkspaceId[]) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`DELETE FROM channels.channels WHERE workspace_id IN ${sql.in(workspaceIds)}`
  ).pipe(Effect.orDie);

layer(OverviewTest)("the channels across workspaces", (it) => {
  it.effect(
    "are counted by status per workspace, and a workspace without any is left out",
    () =>
      Effect.gen(function* counted() {
        const first = yield* freshWorkspace;
        const second = yield* freshWorkspace;
        const empty = yield* freshWorkspace;

        yield* kept(yield* freshChannel(first));
        yield* kept(markRefreshNeeded(yield* freshChannel(first), later));
        yield* kept(disable(yield* freshChannel(first), later));
        yield* kept(
          disable(markRefreshNeeded(yield* freshChannel(first), later), later)
        );
        yield* kept(yield* freshChannel(second, { platform: "bluesky" }));

        const states = yield* ChannelOverview.use((overview) =>
          overview.statesIn([first, second, empty])
        ).pipe(Effect.ensuring(deleteIn([first, second])));

        assert.deepStrictEqual(states.get(first), {
          connected: 4,
          off: 2,
          toReconnect: 1,
        });
        assert.deepStrictEqual(states.get(second), {
          connected: 1,
          off: 0,
          toReconnect: 0,
        });
        assert.isFalse(states.has(empty));
      })
  );

  it.effect("give each connected channel's platform", () =>
    Effect.gen(function* platforms() {
      const first = yield* freshWorkspace;
      const second = yield* freshWorkspace;
      const mastodon = yield* kept(yield* freshChannel(first));

      const bluesky = yield* kept(
        yield* freshChannel(second, { platform: "bluesky" })
      );

      const gone = yield* newId(ChannelIdSchema);

      const found = yield* ChannelOverview.use((overview) =>
        overview.platformsOf([mastodon.id, bluesky.id, gone])
      ).pipe(Effect.ensuring(deleteIn([first, second])));

      assert.deepStrictEqual(
        found,
        new Map([
          [mastodon.id, "mastodon"],
          [bluesky.id, "bluesky"],
        ])
      );
    })
  );
});
