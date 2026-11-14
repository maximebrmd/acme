import { Effect, Layer, Option } from "effect";

import { ListChannels } from "#channels/application/list-channels.ts";
import { ChannelConnections } from "#publishing/application/channel-connections.ts";
import { connectionOf } from "#shared/domain/channel-connection.ts";
import { isSocialPlatform } from "#shared/domain/platform.ts";

/**
 * Each channel's way in as the channels context lists it for the actor: a
 * channel stored without one, on a platform that has several, came the
 * first way there was (`connectionOf`).
 */
export const ListedChannelConnections = Layer.effect(
  ChannelConnections,
  Effect.gen(function* ListedChannelConnections() {
    const listChannels = yield* ListChannels;

    return ChannelConnections.of({
      of: (actor, channelId) =>
        listChannels
          .list(actor)
          .pipe(
            Effect.map((channels) =>
              Option.fromUndefinedOr(
                channels.find(({ id }) => id === channelId)
              ).pipe(
                Option.flatMap(({ connection, platform }) =>
                  isSocialPlatform(platform)
                    ? connectionOf(platform, connection)
                    : Option.none()
                )
              )
            )
          ),
    });
  })
);
