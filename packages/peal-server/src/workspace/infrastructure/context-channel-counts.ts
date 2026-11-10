import { Effect, Layer } from "effect";

import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { WorkspaceChannelCounts } from "#workspace/application/workspace-channel-counts.ts";

/** WorkspaceChannelCounts, as the channels context counts them. */
export const ContextChannelCountsLive = Layer.effect(
  WorkspaceChannelCounts,
  Effect.gen(function* ContextChannelCountsLive() {
    const usage = yield* ChannelUsage;

    return WorkspaceChannelCounts.of({
      of: (workspaceIds) => usage.connectedIn(workspaceIds),
    });
  })
);
