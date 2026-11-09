import { Api, ChannelNotFound, CurrentMember, Forbidden } from "acme-contract";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { actorOf } from "#shared/api/actor.ts";

import { toChannelView } from "./channel-view.ts";

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

          return channels.map(toChannelView);
        }),
    });
  })
);
