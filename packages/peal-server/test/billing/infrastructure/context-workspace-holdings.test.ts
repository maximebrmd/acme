import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { WorkspaceHoldings } from "#billing/application/ports/workspace-holdings.ts";
import { ContextWorkspaceHoldingsLive } from "#billing/infrastructure/context-workspace-holdings.ts";
import { ChannelEvents } from "#channels/application/channel-events.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { WebhookChannelEvents } from "#channels/infrastructure/webhook-channel-events.ts";
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
import { WorkspaceMembers } from "#workspace/application/workspace-members.ts";

// What a workspace over its plan gives up goes through the contexts that
// hold it, as the server wires them: a channel a manager chose not to keep
// is disconnected by the channels context, which tells the workspace's
// webhook endpoints. Members are the workspace context's: none here.
const Test = ContextWorkspaceHoldingsLive.pipe(
  Layer.provide(Layer.mock(WorkspaceMembers, {})),
  Layer.provideMerge(
    Layer.mergeAll(DisconnectChannel.layer, ListChannels.layer)
  ),
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

layer(Test)("what a workspace over its plan gives up", (it) => {
  it.effect(
    "tells its webhook endpoints of each channel disconnected, once",
    () =>
      Effect.gen(function* reduced() {
        const owner = yield* freshOwner;
        const channels = yield* ChannelRepository;
        const events = yield* ChannelEvents;
        const holdings = yield* WorkspaceHoldings;

        const { endpoint } = yield* freshEndpoint(owner, {
          eventTypes: ["channel.disconnected"],
        });

        const kept = yield* freshChannel(owner.workspaceId);
        const leaving = yield* freshChannel(owner.workspaceId);

        for (const channel of [kept, leaving]) {
          yield* channels.addingTo(
            owner.workspaceId,
            channels
              .insert(channel, syntheticCredentials(channel))
              .pipe(Effect.andThen(events.connected(channel, false)))
          );
        }

        assert.sameMembers(
          [...(yield* holdings.channels(owner))],
          [kept.id, leaving.id]
        );

        yield* holdings.disconnect(owner, leaving.id);
        // Chosen again, as when a reduction stopped midway: it is gone, and
        // nothing more is told.
        yield* holdings.disconnect(owner, leaving.id);

        assert.deepStrictEqual(yield* eventsSentTo(owner, endpoint.id), [
          {
            data: {
              channelId: leaving.id,
              platform: leaving.platform,
              workspaceId: owner.workspaceId,
            },
            type: "channel.disconnected",
          },
        ]);
        assert.deepStrictEqual(yield* holdings.channels(owner), [kept.id]);
        assert.isTrue(Option.isNone(yield* channels.get(leaving.id)));
      })
  );
});
