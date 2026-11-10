import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { ChannelOptions } from "#publishing/domain/channel-options.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * The options a workspace's new posts take on a channel when they give
 * none there, as they are kept: one row a channel at most.
 */
export class ChannelDefaultsStore extends Context.Service<
  ChannelDefaultsStore,
  {
    /** The defaults kept for these channels of the workspace. */
    readonly among: (
      workspaceId: WorkspaceId,
      channelIds: readonly ChannelId[]
    ) => Effect.Effect<readonly ChannelOptions[], DatabaseError>;
    /** Keeps these as the channel's defaults, instead of any it had. */
    readonly put: (
      workspaceId: WorkspaceId,
      defaults: ChannelOptions,
      now: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    readonly remove: (
      workspaceId: WorkspaceId,
      channelId: ChannelId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/ChannelDefaultsStore") {}
