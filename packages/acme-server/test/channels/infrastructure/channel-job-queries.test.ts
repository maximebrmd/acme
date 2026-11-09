import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { disable, markRefreshNeeded } from "#channels/domain/channel.ts";
import type { Channel, TokenLifetime } from "#channels/domain/channel.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  syntheticCredentials,
} from "#test/channels/support.ts";

const RepositoryTest = DrizzleChannelRepository.pipe(
  Layer.provideMerge(DatabaseTest)
);

// The job queries scan every workspace. These tests work in 2001, long
// before anything other suites store expires, and look for their own
// channels among what comes back.
const start = DateTime.makeUnsafe("2001-03-01T12:00:00Z");

const at = (offset: Duration.Input) =>
  DateTime.addDuration(start, Duration.fromInputUnsafe(offset));

const everything = 100_000;

const stored = Effect.fn("stored")(function* stored(
  workspaceId: WorkspaceId,
  token: TokenLifetime,
  platform: Platform = "x"
) {
  const channel = yield* freshChannel(workspaceId, { platform, token });

  yield* ChannelRepository.use((channels) =>
    channels.insert(channel, syntheticCredentials(channel))
  );

  return channel;
});

const save = (channel: Channel) =>
  ChannelRepository.use((channels) => channels.update(channel, Option.none()));

const idsIn = (workspaceId: WorkspaceId, found: readonly Channel[]) =>
  found.flatMap((channel) =>
    channel.workspaceId === workspaceId ? [channel.id] : []
  );

const refreshable = (expiresAt: DateTime.Utc): TokenLifetime => ({
  _tag: "refreshable",
  expiresAt,
});

const lasting = (
  issuedAt: DateTime.Utc,
  expiresAt: DateTime.Utc
): TokenLifetime => ({ _tag: "nonRefreshable", expiresAt, issuedAt });

layer(RepositoryTest)("the channel job queries", (it) => {
  it.effect(
    "find the active refreshable channels before their platform's cutoff",
    () =>
      Effect.gen(function* dueForRefresh() {
        const channels = yield* ChannelRepository;
        const workspaceId = yield* freshWorkspace;

        const soon = yield* stored(workspaceId, refreshable(at("10 minutes")));
        const past = yield* stored(workspaceId, refreshable(at("-1 day")));
        const later = yield* stored(workspaceId, refreshable(at("2 hours")));

        const blueskySoon = yield* stored(
          workspaceId,
          refreshable(at("20 days")),
          "bluesky"
        );

        const threadsSoon = yield* stored(
          workspaceId,
          refreshable(at("10 minutes")),
          "threads"
        );

        const cannotRenew = yield* stored(workspaceId, {
          _tag: "nonRefreshable",
          expiresAt: at("10 minutes"),
          issuedAt: at("-1 day"),
        });

        const broken = yield* stored(
          workspaceId,
          refreshable(at("10 minutes"))
        );

        const off = yield* stored(workspaceId, refreshable(at("10 minutes")));

        yield* save(markRefreshNeeded(broken, start));
        yield* save(disable(off, start));

        const due = yield* channels.dueForRefresh({
          cutoffs: [
            { before: at("30 minutes"), platform: "x" },
            { before: at("30 days"), platform: "bluesky" },
          ],
          limit: everything,
        });

        const ids = idsIn(workspaceId, due);

        assert.sameMembers(ids, [soon.id, past.id, blueskySoon.id]);
        // Soonest first.
        assert.deepStrictEqual(ids, [past.id, soon.id, blueskySoon.id]);
        assert.notInclude(ids, later.id);
        assert.notInclude(ids, threadsSoon.id);
        assert.notInclude(ids, cannotRenew.id);

        assert.deepStrictEqual(
          yield* channels.dueForRefresh({ cutoffs: [], limit: everything }),
          []
        );
      })
  );

  it.effect(
    "find the channels to reconnect: marked, or expiring without renewal",
    () =>
      Effect.gen(function* needingReconnect() {
        const channels = yield* ChannelRepository;
        const workspaceId = yield* freshWorkspace;

        // 60-day tokens: warned from a week before they expire.
        const inSixDays = yield* stored(
          workspaceId,
          lasting(at("-54 days"), at("6 days"))
        );

        const inEightDays = yield* stored(
          workspaceId,
          lasting(at("-52 days"), at("8 days"))
        );

        const expired = yield* stored(
          workspaceId,
          lasting(at("-61 days"), at("-1 day"))
        );

        // A 4-day token is warned from half its life: 2 days before.
        const shortLeft = yield* stored(
          workspaceId,
          lasting(at("-3 days"), at("1 day"))
        );

        const shortFresh = yield* stored(
          workspaceId,
          lasting(at("-1 day"), at("3 days"))
        );

        const renewing = yield* stored(workspaceId, {
          _tag: "refreshable",
          expiresAt: at("1 day"),
        });

        const marked = yield* stored(workspaceId, { _tag: "nonExpiring" });

        const off = yield* stored(
          workspaceId,
          lasting(at("-61 days"), at("-1 day"))
        );

        yield* save(markRefreshNeeded(marked, start));
        yield* save(disable(off, start));

        const found = yield* channels.needingReconnect({
          leadTime: Duration.days(7),
          limit: everything,
          now: start,
        });

        assert.sameMembers(idsIn(workspaceId, found), [
          inSixDays.id,
          expired.id,
          shortLeft.id,
          marked.id,
        ]);

        for (const left of [inEightDays, shortFresh, renewing, off]) {
          assert.notInclude(idsIn(workspaceId, found), left.id);
        }
      })
  );
});
