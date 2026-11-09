import { Effect, Layer } from "effect";

import { ChannelHealth } from "#publishing/application/channel-health.ts";

/**
 * Logs that a channel needs reconnecting, until the channels context offers a
 * use case that flags the channel and tells its workspace.
 */
export const LoggedChannelHealth = Layer.succeed(
  ChannelHealth,
  ChannelHealth.of({
    reconnectRequired: (channelId) =>
      Effect.logWarning("A channel must be reconnected").pipe(
        Effect.annotateLogs({ channelId })
      ),
  })
);
