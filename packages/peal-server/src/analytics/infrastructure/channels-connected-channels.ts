import { Effect, Layer } from "effect";

import { ConnectedChannels } from "#analytics/application/connected-channels.ts";
import { ChannelDirectory } from "#channels/application/channel-directory.ts";

/** The connected channels, as the channels context lists them. */
export const ChannelsConnectedChannels = Layer.effect(
  ConnectedChannels,
  Effect.gen(function* ChannelsConnectedChannels() {
    const directory = yield* ChannelDirectory;

    return ConnectedChannels.of({ after: directory.after });
  })
);
