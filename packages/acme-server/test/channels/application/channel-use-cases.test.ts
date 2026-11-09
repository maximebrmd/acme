import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  actorIn,
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  syntheticCredentials,
} from "#test/channels/support.ts";

const UseCasesTest = Layer.mergeAll(
  ListChannels.layer,
  DisconnectChannel.layer
).pipe(
  Layer.provideMerge(DrizzleChannelRepository),
  Layer.provideMerge(DatabaseTest)
);

// A channel connected to the workspace, with its tokens.
const connected = Effect.fn("connected")(function* connected(
  workspaceId: WorkspaceId
) {
  const channel = yield* freshChannel(workspaceId);

  yield* ChannelRepository.use((channels) =>
    channels.insert(channel, syntheticCredentials(channel))
  );

  return channel;
});

const stillThere = Effect.fn("stillThere")(function* stillThere(
  workspaceId: WorkspaceId,
  channelId: string
) {
  const channels = yield* ChannelRepository.use((repository) =>
    repository.list(workspaceId)
  );

  return channels.some((channel) => channel.id === channelId);
});

// Disconnects as a member who may.
const disconnect = (workspaceId: WorkspaceId, channelId: string) =>
  DisconnectChannel.use((useCase) =>
    useCase.disconnect(
      actorIn(workspaceId, ["channel:read", "channel:disconnect"]),
      channelId
    )
  );

layer(UseCasesTest)("listing channels", (it) => {
  it.effect("lists the actor's workspace's channels", () =>
    Effect.gen(function* lists() {
      const workspaceId = yield* freshWorkspace;
      const first = yield* connected(workspaceId);
      const second = yield* connected(workspaceId);

      yield* connected(yield* freshWorkspace);

      const channels = yield* ListChannels.use((useCase) =>
        useCase.list(actorIn(workspaceId, ["channel:read"]))
      );

      assert.deepStrictEqual(channels, [first, second]);
    })
  );

  it.effect("needs channel:read", () =>
    Effect.gen(function* forbidden() {
      const workspaceId = yield* freshWorkspace;

      yield* connected(workspaceId);

      const error = yield* Effect.flip(
        ListChannels.use((useCase) =>
          useCase.list(actorIn(workspaceId, ["post:read", "channel:connect"]))
        )
      );

      assert.deepInclude(error, {
        _tag: "MissingPermission",
        permission: "channel:read",
      });
    })
  );
});

layer(UseCasesTest)("disconnecting a channel", (it) => {
  it.effect("deletes the channel and its tokens", () =>
    Effect.gen(function* disconnects() {
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const kept = yield* connected(workspaceId);

      yield* disconnect(workspaceId, channel.id);

      assert.isFalse(yield* stillThere(workspaceId, channel.id));
      assert.isTrue(yield* stillThere(workspaceId, kept.id));
      assert.deepStrictEqual(
        yield* ChannelRepository.use((channels) =>
          channels.credentials(channel.id)
        ),
        Option.none()
      );
    })
  );

  it.effect.each([
    { id: "00000000-0000-7000-8000-00000000abcd", label: "no channel" },
    { id: "not-a-channel-id", label: "no channel id at all" },
  ])("answers ChannelNotFound for an id that names $label", ({ id }) =>
    Effect.gen(function* notFound() {
      const error = yield* Effect.flip(disconnect(yield* freshWorkspace, id));

      assert.deepInclude(error, { _tag: "ChannelNotFound", channelId: id });
    })
  );

  it.effect("answers ChannelNotFound for another workspace's channel", () =>
    Effect.gen(function* otherWorkspace() {
      const owner = yield* freshWorkspace;
      const channel = yield* connected(owner);

      const error = yield* Effect.flip(
        disconnect(yield* freshWorkspace, channel.id)
      );

      assert.strictEqual(error._tag, "ChannelNotFound");
      assert.isTrue(yield* stillThere(owner, channel.id));
    })
  );

  it.effect("needs channel:disconnect, whether the channel exists or not", () =>
    Effect.gen(function* forbidden() {
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const reader = actorIn(workspaceId, ["channel:read", "channel:connect"]);

      for (const id of [channel.id, "not-a-channel-id"]) {
        const error = yield* Effect.flip(
          DisconnectChannel.use((useCase) => useCase.disconnect(reader, id))
        );

        assert.deepInclude(error, {
          _tag: "MissingPermission",
          permission: "channel:disconnect",
        });
      }

      assert.isTrue(yield* stillThere(workspaceId, channel.id));
    })
  );
});
