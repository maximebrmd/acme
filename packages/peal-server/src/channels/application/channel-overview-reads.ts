import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

/**
 * A workspace's channels by status: how many it has connected, how many
 * wait to be reconnected (`refreshNeeded`) and how many are turned off
 * (`disabled`), as the channels page shows each.
 */
export interface ChannelStateCounts {
  readonly connected: number;
  readonly off: number;
  readonly toReconnect: number;
}

/** The queries behind `ChannelOverview`, every id in one parameter. */
export class ChannelOverviewReads extends Context.Service<
  ChannelOverviewReads,
  {
    readonly statesIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, ChannelStateCounts>,
      DatabaseError
    >;
    readonly platformsOf: (
      channelIds: readonly ChannelId[]
    ) => Effect.Effect<ReadonlyMap<ChannelId, Platform>, DatabaseError>;
  }
>()("peal-server/channels/application/ChannelOverviewReads") {}
