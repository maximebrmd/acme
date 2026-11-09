import { Api, ChannelNotFound, CurrentMember, Forbidden } from "acme-contract";
import type { Channel as ChannelView } from "acme-contract";
import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { actorOf } from "#shared/api/actor.ts";

// What clients see of a channel: never its tokens. The expiry shown is the
// one the user must reconnect by; a token that renews itself has none.
const toView = (channel: Channel): ChannelView => ({
  avatarUrl: Option.getOrNull(channel.avatarUrl),
  displayName: Option.getOrNull(channel.displayName),
  handle: channel.handle,
  id: channel.id,
  platform: channel.platform,
  status: channel.status,
  tokenExpiresAt:
    channel.token._tag === "nonRefreshable" ? channel.token.expiresAt : null,
});

const forbidden = () => Effect.fail(new Forbidden());

export const ChannelsHandlers = HttpApiBuilder.group(
  Api,
  "channels",
  Effect.fn(function* channelsHandlers(handlers) {
    const listChannels = yield* ListChannels;
    const disconnectChannel = yield* DisconnectChannel;

    return handlers.handleAll({
      disconnect: ({ params }) =>
        Effect.gen(function* disconnect() {
          const actor = actorOf(yield* CurrentMember);

          yield* disconnectChannel.disconnect(actor, params.channelId).pipe(
            Effect.catchTags({
              ChannelNotFound: () => Effect.fail(new ChannelNotFound()),
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
      list: () =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          const channels = yield* listChannels.list(actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          return channels.map(toView);
        }),
    });
  })
);
