import { Effect, Layer, Option } from "effect";

import { ListChannels } from "#channels/application/list-channels.ts";
import { WorkspaceChannels } from "#publishing/application/workspace-channels.ts";
import { isSocialPlatform } from "#shared/domain/platform.ts";

/**
 * The workspace's channels as the channels context lists them for the actor,
 * so a post goes only where the actor can see a channel. A website's
 * channel takes articles, never posts: it is none of a post's.
 */
export const ListedWorkspaceChannels = Layer.effect(
  WorkspaceChannels,
  Effect.gen(function* ListedWorkspaceChannels() {
    const listChannels = yield* ListChannels;

    return WorkspaceChannels.of({
      lookUp: (actor, channelIds) =>
        listChannels.list(actor).pipe(
          Effect.map((channels) =>
            channels.flatMap(({ connection, id, platform }) =>
              channelIds.includes(id) && isSocialPlatform(platform)
                ? [
                    Option.match(connection, {
                      onNone: () => ({ channelId: id, platform }),
                      onSome: (through) => ({
                        channelId: id,
                        connection: through,
                        platform,
                      }),
                    }),
                  ]
                : []
            )
          )
        ),
    });
  })
);
