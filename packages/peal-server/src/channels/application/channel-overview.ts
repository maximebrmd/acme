import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { ChannelOverviewReads } from "./channel-overview-reads.ts";
import type { ChannelStateCounts } from "./channel-overview-reads.ts";

export type { ChannelStateCounts } from "./channel-overview-reads.ts";

/**
 * The channels of several workspaces at once, for the view across a
 * person's workspaces: each one's channels by status, and the platform of
 * each channel an agenda names. Counts and platforms only, so it checks no
 * permission: the caller decided which workspaces the person may read
 * channels in.
 */
export class ChannelOverview extends Context.Service<
  ChannelOverview,
  {
    /** Each workspace's counts; one without any channel is left out. */
    readonly statesIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, ChannelStateCounts>,
      DatabaseError
    >;
    /** Each channel's platform; a channel no longer connected is left out. */
    readonly platformsOf: (
      channelIds: readonly ChannelId[]
    ) => Effect.Effect<ReadonlyMap<ChannelId, Platform>, DatabaseError>;
  }
>()("peal-server/channels/application/ChannelOverview") {
  static readonly layer = Layer.effect(
    ChannelOverview,
    Effect.gen(function* ChannelOverviewLive() {
      const reads = yield* ChannelOverviewReads;

      return ChannelOverview.of({
        platformsOf: (channelIds) =>
          (channelIds.length === 0
            ? Effect.succeed(new Map<ChannelId, Platform>())
            : reads.platformsOf(channelIds)
          ).pipe(Effect.withSpan("ChannelOverview.platformsOf")),
        statesIn: (workspaceIds) =>
          (workspaceIds.length === 0
            ? Effect.succeed(new Map<WorkspaceId, ChannelStateCounts>())
            : reads.statesIn(workspaceIds)
          ).pipe(Effect.withSpan("ChannelOverview.statesIn")),
      });
    })
  );
}
