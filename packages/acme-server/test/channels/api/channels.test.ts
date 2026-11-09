import { assert, layer } from "@effect/vitest";
import { Api, ChannelNotFound, Forbidden } from "acme-contract";
import type { Member } from "acme-contract";
import { DateTime, Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import { ChannelsHandlers } from "#channels/api/channels.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import type { TokenLifetime } from "#channels/domain/channel.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  memberOf,
  nonRefreshable,
  refreshable,
  syntheticCredentials,
} from "#test/channels/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const UseCasesTest = Layer.mergeAll(
  ListChannels.layer,
  DisconnectChannel.layer
).pipe(
  Layer.provideMerge(DrizzleChannelRepository),
  Layer.provideMerge(DatabaseTest)
);

// A client of the channels endpoints whose every request acts as the member,
// as the WorkspaceAccess middleware would hand them to the handlers.
const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["channels"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        ChannelsHandlers.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const owner = (workspaceId: WorkspaceId) =>
  memberOf(workspaceId, permissionsFor("owner"));

// Reads channels, and may not disconnect them.
const viewer = (workspaceId: WorkspaceId) =>
  memberOf(workspaceId, permissionsFor("viewer"));

// May do nothing with channels.
const postReader = (workspaceId: WorkspaceId) =>
  memberOf(workspaceId, ["post:read"]);

const connected = Effect.fn("connected")(function* connected(
  workspaceId: WorkspaceId,
  token: TokenLifetime = nonRefreshable
) {
  const channel = yield* freshChannel(workspaceId, { token });

  yield* ChannelRepository.use((channels) =>
    channels.insert(channel, syntheticCredentials(channel))
  );

  return channel;
});

const channelIdsOf = Effect.fn("channelIdsOf")(function* channelIdsOf(
  workspaceId: WorkspaceId
) {
  const channels = yield* ChannelRepository.use((repository) =>
    repository.list(workspaceId)
  );

  return channels.map((channel) => channel.id);
});

layer(UseCasesTest)("the channels endpoints", (it) => {
  it.effect("list the member's channels, without their tokens", () =>
    Effect.gen(function* lists() {
      const workspaceId = yield* freshWorkspace;
      const expiring = yield* connected(workspaceId);
      const renewing = yield* connected(workspaceId, refreshable);
      const client = yield* clientAs(owner(workspaceId));
      const params = { workspaceId };

      const listed = yield* client.channels.list({ params });

      assert.deepStrictEqual(listed, [
        {
          avatarUrl: `https://social.example/avatars/${expiring.id}.png`,
          displayName: "Acme Example",
          handle: "@acme_example",
          id: expiring.id,
          platform: "mastodon",
          status: { _tag: "active" },
          tokenExpiresAt: DateTime.makeUnsafe("2026-08-14T07:00:00.123Z"),
        },
        {
          avatarUrl: `https://social.example/avatars/${renewing.id}.png`,
          displayName: "Acme Example",
          handle: "@acme_example",
          id: renewing.id,
          platform: "mastodon",
          status: { _tag: "active" },
          tokenExpiresAt: null,
        },
      ]);

      const response = yield* client.channels.list({
        params,
        responseMode: "response-only",
      });

      const body = yield* response.text;

      assert.notInclude(body, "synthetic-iv");
      assert.notInclude(body, "scopes");
      assert.notInclude(body, expiring.accountId);
    })
  );

  it.effect("let a viewer read the channels", () =>
    Effect.gen(function* viewerLists() {
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const client = yield* clientAs(viewer(workspaceId));

      const listed = yield* client.channels.list({ params: { workspaceId } });

      assert.deepStrictEqual(
        listed.map(({ id }) => id),
        [channel.id]
      );
    })
  );

  it.effect("answer 403 to a member without channel:read", () =>
    Effect.gen(function* forbidden() {
      const workspaceId = yield* freshWorkspace;

      yield* connected(workspaceId);

      const client = yield* clientAs(postReader(workspaceId));
      const params = { workspaceId };

      assert.instanceOf(
        yield* Effect.flip(client.channels.list({ params })),
        Forbidden
      );

      const response = yield* client.channels.list({
        params,
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 403);
    })
  );

  it.effect(
    "show a member only their own workspace's channels, whatever the path",
    () =>
      Effect.gen(function* otherWorkspace() {
        const theirs = yield* freshWorkspace;
        const mine = yield* freshWorkspace;
        const channel = yield* connected(mine);

        yield* connected(theirs);

        const client = yield* clientAs(owner(mine));

        const listed = yield* client.channels.list({
          params: { workspaceId: theirs },
        });

        assert.deepStrictEqual(
          listed.map(({ id }) => id),
          [channel.id]
        );
      })
  );

  it.effect("disconnect a channel, answering 204", () =>
    Effect.gen(function* disconnects() {
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const kept = yield* connected(workspaceId);
      const client = yield* clientAs(owner(workspaceId));
      const params = { channelId: channel.id, workspaceId };

      const response = yield* client.channels.disconnect({
        params,
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 204);
      assert.deepStrictEqual(yield* channelIdsOf(workspaceId), [kept.id]);
    })
  );

  it.effect.each([
    { channelId: "00000000-0000-7000-8000-00000000abcd", label: "no channel" },
    { channelId: "not-a-channel-id", label: "no channel id" },
  ])("answer 404 to the disconnection of $label", ({ channelId }) =>
    Effect.gen(function* notFound() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* clientAs(owner(workspaceId));
      const params = { channelId, workspaceId };

      assert.instanceOf(
        yield* Effect.flip(client.channels.disconnect({ params })),
        ChannelNotFound
      );

      const response = yield* client.channels.disconnect({
        params,
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 404);
    })
  );

  it.effect(
    "answer 404 to the disconnection of another workspace's channel",
    () =>
      Effect.gen(function* otherWorkspace() {
        const theirs = yield* freshWorkspace;
        const channel = yield* connected(theirs);
        const mine = yield* freshWorkspace;
        const client = yield* clientAs(owner(mine));

        const error = yield* Effect.flip(
          client.channels.disconnect({
            params: { channelId: channel.id, workspaceId: theirs },
          })
        );

        assert.instanceOf(error, ChannelNotFound);
        assert.deepStrictEqual(yield* channelIdsOf(theirs), [channel.id]);
      })
  );

  it.effect("answer 403 to a member without channel:disconnect", () =>
    Effect.gen(function* forbidden() {
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const params = { channelId: channel.id, workspaceId };

      for (const member of [viewer(workspaceId), postReader(workspaceId)]) {
        const client = yield* clientAs(member);

        assert.instanceOf(
          yield* Effect.flip(client.channels.disconnect({ params })),
          Forbidden
        );
      }

      assert.deepStrictEqual(yield* channelIdsOf(workspaceId), [channel.id]);
    })
  );
});
