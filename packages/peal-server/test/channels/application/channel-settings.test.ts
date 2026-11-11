import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { ChannelEvents } from "#channels/application/channel-events.ts";
import { ChannelNotFound } from "#channels/application/channel-not-found.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ChannelSettings } from "#channels/application/channel-settings.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { markRefreshNeeded } from "#channels/domain/channel.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { Platform } from "#shared/domain/platform.ts";
import {
  actorIn,
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  later,
  syntheticCredentials,
} from "#test/channels/support.ts";
import { TransactionsTest } from "#test/notifications/support.ts";

// What a workspace decides about a channel it keeps (its name, whether it
// is on), and the list it finds its channels in.

const UseCasesTest = Layer.mergeAll(
  ChannelSettings.layer,
  ListChannels.layer
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      ChannelEvents.none,
      DrizzleChannelRepository,
      SqlChannelLocks,
      TransactionsTest
    )
  ),
  Layer.provideMerge(DatabaseTest)
);

const connected = Effect.fn("connected")(function* connected(
  workspaceId: WorkspaceId,
  platform: Platform = "mastodon"
) {
  const channel = yield* freshChannel(workspaceId, { platform });

  yield* ChannelRepository.use((channels) =>
    channels.insert(channel, syntheticCredentials(channel))
  );

  return channel;
});

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

const reader = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read"]);

const stored = (workspaceId: WorkspaceId, channelId: string) =>
  ChannelRepository.use((channels) => channels.list(workspaceId)).pipe(
    Effect.map((all) => all.find(({ id }) => id === channelId)),
    Effect.map(Option.fromUndefinedOr),
    Effect.map(Option.getOrThrow)
  );

const everything = {
  after: Option.none(),
  limit: 50,
  platform: Option.none(),
  query: Option.none(),
  status: Option.none(),
};

layer(UseCasesTest)("a channel's name in its workspace", (it) => {
  it.effect("is given, changed and taken back, and nothing else changes", () =>
    Effect.gen(function* renames() {
      const settings = yield* ChannelSettings;
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);

      const named = yield* settings.rename(
        manager(workspaceId),
        channel.id,
        Option.some("Client A")
      );

      assert.deepStrictEqual(named.label, Option.some("Client A"));

      const kept = yield* stored(workspaceId, channel.id);

      assert.deepStrictEqual(kept.label, Option.some("Client A"));
      assert.strictEqual(kept.handle, channel.handle);
      assert.deepStrictEqual(kept.displayName, channel.displayName);
      assert.deepStrictEqual(kept.status, channel.status);

      // A renewal that read the channel before it was named writes the
      // rest of the row: the name stays.
      yield* ChannelRepository.use((channels) =>
        channels.update(markRefreshNeeded(channel, later), Option.none())
      );

      const after = yield* stored(workspaceId, channel.id);

      assert.deepStrictEqual(after.label, Option.some("Client A"));
      assert.strictEqual(after.status._tag, "refreshNeeded");

      const unnamed = yield* settings.rename(
        manager(workspaceId),
        channel.id,
        Option.none()
      );

      assert.deepStrictEqual(unnamed.label, Option.none());
    })
  );

  it.effect("is for members who manage channels, in their workspace", () =>
    Effect.gen(function* refuses() {
      const settings = yield* ChannelSettings;
      const workspaceId = yield* freshWorkspace;
      const elsewhere = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);

      const byReader = yield* settings
        .rename(reader(workspaceId), channel.id, Option.some("Mine"))
        .pipe(Effect.flip);

      assert.instanceOf(byReader, MissingPermission);

      const foreign = yield* settings
        .rename(manager(elsewhere), channel.id, Option.some("Theirs"))
        .pipe(Effect.flip);

      assert.instanceOf(foreign, ChannelNotFound);

      const malformed = yield* settings
        .turnOff(manager(workspaceId), "not-an-id")
        .pipe(Effect.flip);

      assert.instanceOf(malformed, ChannelNotFound);
    })
  );
});

layer(UseCasesTest)("turning a channel off and on", (it) => {
  it.effect("keeps its tokens and its name, and posts again once on", () =>
    Effect.gen(function* switches() {
      const settings = yield* ChannelSettings;
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const actor = manager(workspaceId);

      yield* settings.rename(actor, channel.id, Option.some("Client A"));

      const off = yield* settings.turnOff(actor, channel.id);

      assert.deepStrictEqual(off.status, {
        _tag: "disabled",
        refreshNeeded: false,
      });

      // Off already: as it is.
      const again = yield* settings.turnOff(actor, channel.id);

      assert.deepStrictEqual(again.status, off.status);

      const kept = yield* stored(workspaceId, channel.id);

      assert.deepStrictEqual(kept.status, off.status);
      assert.deepStrictEqual(kept.label, Option.some("Client A"));

      const credentials = yield* ChannelRepository.use((channels) =>
        channels.credentials(channel.id)
      );

      assert.isTrue(Option.isSome(credentials));

      const on = yield* settings.turnOn(actor, channel.id);

      assert.deepStrictEqual(on.status, { _tag: "active" });
      assert.deepStrictEqual((yield* stored(workspaceId, channel.id)).status, {
        _tag: "active",
      });
    })
  );

  it.effect("asks to reconnect one whose token stopped working", () =>
    Effect.gen(function* remembers() {
      const settings = yield* ChannelSettings;
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const actor = manager(workspaceId);

      yield* ChannelRepository.use((channels) =>
        channels.update(markRefreshNeeded(channel, later), Option.none())
      );

      const off = yield* settings.turnOff(actor, channel.id);

      assert.deepStrictEqual(off.status, {
        _tag: "disabled",
        refreshNeeded: true,
      });

      const on = yield* settings.turnOn(actor, channel.id);

      assert.deepStrictEqual(on.status, { _tag: "refreshNeeded" });
    })
  );

  it.effect("is refused to a member who only reads channels", () =>
    Effect.gen(function* refuses() {
      const settings = yield* ChannelSettings;
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);

      const refused = yield* settings
        .turnOff(reader(workspaceId), channel.id)
        .pipe(Effect.flip);

      assert.instanceOf(refused, MissingPermission);
      assert.deepStrictEqual((yield* stored(workspaceId, channel.id)).status, {
        _tag: "active",
      });
    })
  );
});

layer(UseCasesTest)("finding channels", (it) => {
  it.effect("by platform, status and text, with how many are in each", () =>
    Effect.gen(function* searches() {
      const listing = yield* ListChannels;
      const settings = yield* ChannelSettings;
      const workspaceId = yield* freshWorkspace;
      const actor = manager(workspaceId);

      const first = yield* connected(workspaceId, "mastodon");
      const second = yield* connected(workspaceId, "bluesky");
      const third = yield* connected(workspaceId, "mastodon");

      // Another workspace's channels are never found.
      yield* connected(yield* freshWorkspace, "mastodon");

      yield* settings.rename(actor, second.id, Option.some("Client 100%"));
      yield* settings.turnOff(actor, third.id);

      const all = yield* listing.search(actor, everything);

      assert.deepStrictEqual(
        all.items.map(({ id }) => id),
        [first.id, second.id, third.id]
      );
      assert.deepStrictEqual(all.counts, {
        active: 2,
        disabled: 1,
        refreshNeeded: 0,
      });
      assert.isTrue(Option.isNone(all.next));

      const onMastodon = yield* listing.search(actor, {
        ...everything,
        platform: Option.some("mastodon"),
        status: Option.some("active"),
      });

      assert.deepStrictEqual(
        onMastodon.items.map(({ id }) => id),
        [first.id]
      );
      // Counted by status whatever the status asked for.
      assert.deepStrictEqual(onMastodon.counts, {
        active: 1,
        disabled: 1,
        refreshNeeded: 0,
      });

      // The text is found in the workspace's own name for the channel, and
      // its wildcards are the characters they are.
      const byName = yield* listing.search(actor, {
        ...everything,
        query: Option.some("client 100%"),
      });

      assert.deepStrictEqual(
        byName.items.map(({ id }) => id),
        [second.id]
      );

      const byWildcard = yield* listing.search(actor, {
        ...everything,
        query: Option.some("%"),
      });

      assert.deepStrictEqual(
        byWildcard.items.map(({ id }) => id),
        [second.id]
      );

      const byHandle = yield* listing.search(actor, {
        ...everything,
        query: Option.some("PEAL_EX"),
      });

      assert.strictEqual(byHandle.items.length, 3);
    })
  );

  it.effect("a page at a time, each starting where the last ended", () =>
    Effect.gen(function* pages() {
      const listing = yield* ListChannels;
      const workspaceId = yield* freshWorkspace;
      const actor = reader(workspaceId);

      const first = yield* connected(workspaceId);
      const second = yield* connected(workspaceId);
      const third = yield* connected(workspaceId);

      const one = yield* listing.search(actor, { ...everything, limit: 2 });

      assert.deepStrictEqual(
        one.items.map(({ id }) => id),
        [first.id, second.id]
      );
      assert.deepStrictEqual(one.next, Option.some(second.id));

      const two = yield* listing.search(actor, {
        ...everything,
        after: one.next,
        limit: 2,
      });

      assert.deepStrictEqual(
        two.items.map(({ id }) => id),
        [third.id]
      );
      assert.isTrue(Option.isNone(two.next));

      const refused = yield* listing
        .search(actorIn(workspaceId, ["post:read"]), everything)
        .pipe(Effect.flip);

      assert.instanceOf(refused, MissingPermission);
    })
  );
});
