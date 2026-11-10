import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";

import { ChannelCredentials } from "#channels/application/channel-credentials.ts";
import { ChannelEvents } from "#channels/application/channel-events.ts";
import { ChannelNotices } from "#channels/application/channel-notices.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DataDeletions } from "#channels/application/data-deletions.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import { markRefreshNeeded } from "#channels/domain/channel.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleDataDeletions } from "#channels/infrastructure/drizzle-data-deletions.ts";
import {
  WebhookChannelEvents,
  webhookChannelNotices,
} from "#channels/infrastructure/webhook-channel-events.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorizersOf } from "#test/channels/connect-support.ts";
import {
  freshChannel,
  syntheticCredentials,
  TokenCipherTest,
} from "#test/channels/support.ts";
import { eventsSentTo } from "#test/webhooks/fakes/event-log.ts";
import {
  freshEndpoint,
  freshOwner,
  WebhooksTest,
} from "#test/webhooks/support.ts";

// The notices themselves are the notifications context's: none here.
const SilentNotices = Layer.succeed(
  ChannelNotices,
  ChannelNotices.of({
    reconnectRequired: () => Effect.void,
    reconnectSoon: () => Effect.void,
  })
);

const Test = Layer.mergeAll(
  DisconnectChannel.layer,
  DrizzleDataDeletions,
  webhookChannelNotices(SilentNotices)
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      WebhookChannelEvents,
      TokenCipherTest,
      Layer.succeed(PlatformAuthorizers, authorizersOf())
    )
  ),
  Layer.provideMerge(DrizzleChannelRepository),
  Layer.provideMerge(WebhooksTest)
);

// An endpoint that hears about channels, and a channel saved as connecting
// one saves it: with its event, in the workspace's additions' transaction.
const connected = Effect.fn("connected")(function* connected(owner: Actor) {
  const channels = yield* ChannelRepository;
  const events = yield* ChannelEvents;

  const { endpoint } = yield* freshEndpoint(owner, {
    eventTypes: [
      "channel.connected",
      "channel.disconnected",
      "channel.reconnect_needed",
    ],
  });

  const channel = yield* freshChannel(owner.workspaceId);

  yield* channels.addingTo(
    owner.workspaceId,
    channels
      .insert(channel, syntheticCredentials(channel))
      .pipe(Effect.andThen(events.connected(channel, false)))
  );

  return { channel, endpointId: endpoint.id };
});

layer(Test)("channels, to webhook endpoints", (it) => {
  it.effect(
    "say when an account is connected, and when it is disconnected",
    () =>
      Effect.gen(function* lifecycle() {
        const owner = yield* freshOwner;
        const { channel, endpointId } = yield* connected(owner);

        const data = {
          channelId: channel.id,
          platform: channel.platform,
          workspaceId: owner.workspaceId,
        };

        assert.deepStrictEqual(yield* eventsSentTo(owner, endpointId), [
          { data: { ...data, reconnected: false }, type: "channel.connected" },
        ]);

        yield* DisconnectChannel.use((disconnecting) =>
          disconnecting.disconnect(owner, channel.id)
        );

        const sent = yield* eventsSentTo(owner, endpointId);

        assert.deepStrictEqual(sent[1], { data, type: "channel.disconnected" });
        assert.lengthOf(sent, 2);
        assert.isTrue(
          Option.isNone(
            yield* ChannelRepository.use((channels) => channels.get(channel.id))
          )
        );
      })
  );

  it.effect("say nothing of a connection that rolled back", () =>
    Effect.gen(function* rolledBack() {
      const owner = yield* freshOwner;
      const channels = yield* ChannelRepository;
      const events = yield* ChannelEvents;
      const { endpointId } = yield* connected(owner);
      const other = yield* freshChannel(owner.workspaceId);

      yield* channels
        .addingTo(
          owner.workspaceId,
          channels
            .insert(other, syntheticCredentials(other))
            .pipe(
              Effect.andThen(events.connected(other, false)),
              Effect.andThen(Effect.fail("rolled back" as const))
            )
        )
        .pipe(Effect.flip);

      assert.lengthOf(yield* eventsSentTo(owner, endpointId), 1);
      assert.isTrue(Option.isNone(yield* channels.get(other.id)));
    })
  );

  it.effect(
    "say once that a channel needs reconnecting, however often it is told",
    () =>
      Effect.gen(function* reconnect() {
        const owner = yield* freshOwner;
        const notices = yield* ChannelNotices;
        const { channel, endpointId } = yield* connected(owner);
        const marked = markRefreshNeeded(channel, yield* DateTime.now);

        yield* notices.reconnectRequired(marked);
        // The daily check tells it again.
        yield* notices.reconnectRequired(marked);

        assert.deepStrictEqual(
          (yield* eventsSentTo(owner, endpointId)).map(({ type }) => type),
          ["channel.connected", "channel.reconnect_needed"]
        );
      })
  );

  it.effect(
    "say nothing more of a channel left to reconnect for longer than events are kept",
    () =>
      Effect.gen(function* left() {
        const owner = yield* freshOwner;
        const notices = yield* ChannelNotices;
        const { channel, endpointId } = yield* connected(owner);
        const now = yield* DateTime.now;

        // Marked 40 days ago: its event was sent then, and purged since
        // with its key. The daily check still tells it.
        yield* notices.reconnectRequired(
          markRefreshNeeded(channel, DateTime.subtract(now, { days: 40 }))
        );

        assert.deepStrictEqual(
          (yield* eventsSentTo(owner, endpointId)).map(({ type }) => type),
          ["channel.connected"]
        );

        // One marked days ago, whose event could not be recorded then, is
        // still told.
        yield* notices.reconnectRequired(
          markRefreshNeeded(channel, DateTime.subtract(now, { days: 6 }))
        );

        assert.deepStrictEqual(
          (yield* eventsSentTo(owner, endpointId)).map(({ type }) => type),
          ["channel.connected", "channel.reconnect_needed"]
        );
      })
  );

  it.effect(
    "say that a channel is disconnected when its platform asks for the user's data to be deleted, once",
    () =>
      Effect.gen(function* deleted() {
        const owner = yield* freshOwner;
        const channels = yield* ChannelRepository;
        const deletions = yield* DataDeletions;
        const now = yield* DateTime.now;

        const { endpoint } = yield* freshEndpoint(owner, {
          eventTypes: ["channel.disconnected"],
        });

        const userId = `1033${owner.workspaceId.replaceAll("-", "").slice(-12)}`;

        const page = yield* freshChannel(owner.workspaceId, {
          platform: "facebook",
        });

        const synthetic = syntheticCredentials(page);

        yield* channels.insert(
          page,
          new ChannelCredentials({
            accessToken: synthetic.accessToken,
            grantedBy: userId,
            refreshToken: synthetic.refreshToken,
          })
        );

        const request = {
          app: "facebook" as const,
          code: owner.workspaceId.replaceAll("-", ""),
          now,
          signedRequest: `signed.${userId}`,
          userId,
        };

        const first = yield* deletions.erase(request);
        // Meta sends the same request again: nothing more is told.
        yield* deletions.erase({ ...request, code: `${request.code}2` });

        assert.strictEqual(first.channelsDeleted, 1);
        assert.deepStrictEqual(yield* eventsSentTo(owner, endpoint.id), [
          {
            data: {
              channelId: page.id,
              platform: "facebook",
              workspaceId: owner.workspaceId,
            },
            type: "channel.disconnected",
          },
        ]);
      })
  );
});
