import { Effect, Layer } from "effect";

import { ListChannels } from "#channels/application/list-channels.ts";
import { WorkspaceChannels } from "#publishing/application/workspace-channels.ts";

/**
 * The workspace's channels as the channels context lists them for the actor,
 * so a post goes only where the actor can see a channel.
 */
export const ListedWorkspaceChannels = Layer.effect(
  WorkspaceChannels,
  Effect.gen(function* ListedWorkspaceChannels() {
    const listChannels = yield* ListChannels;

    return WorkspaceChannels.of({
      lookUp: (actor, channelIds) =>
        listChannels
          .list(actor)
          .pipe(
            Effect.map((channels) =>
              channels.flatMap(({ id, platform }) =>
                channelIds.includes(id) ? [{ channelId: id, platform }] : []
              )
            )
          ),
    });
  })
);
