import { Effect, Layer, Option } from "effect";

import { ChannelDirectory } from "#channels/application/channel-directory.ts";
import { MessageChannels } from "#engagement/application/ports/message-channels.ts";

/**
 * The connected channels, from the channels context's directory, a page
 * at a time, with their platforms: the collection follows those whose
 * messages the server reads.
 */
export const ChannelsMessageChannels = Layer.effect(
  MessageChannels,
  Effect.gen(function* ChannelsMessageChannels() {
    const directory = yield* ChannelDirectory;

    return MessageChannels.of({
      after: (after, limit) =>
        directory.after(after, limit).pipe(
          Effect.map((listed) => ({
            channels: listed.map(({ channelId, platform, workspaceId }) => ({
              channelId,
              platform,
              workspaceId,
            })),
            reached:
              listed.length < limit
                ? Option.none()
                : Option.fromUndefinedOr(listed.at(-1)?.channelId),
          }))
        ),
    });
  })
);
