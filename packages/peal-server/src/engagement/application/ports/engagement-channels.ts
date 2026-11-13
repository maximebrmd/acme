import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

/**
 * What engagement needs to know of a channel: where it is, how it came in
 * (a LinkedIn page or profile; none on most platforms), and what its
 * account allowed.
 */
export interface EngagedChannel {
  readonly connection: Option.Option<ChannelConnection>;
  readonly platform: Platform;
  readonly scopes: readonly string[];
}

/** The channels, from the channels context. */
export class EngagementChannels extends Context.Service<
  EngagementChannels,
  {
    /** Whether the channel is connected to the workspace. */
    readonly belongs: (
      channelId: ChannelId,
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
    /** The channel, when it is connected, on and working. */
    readonly describe: (
      channelId: ChannelId
    ) => Effect.Effect<EngagedChannel, ChannelUnreadable | DatabaseError>;
  }
>()("peal-server/engagement/application/EngagementChannels") {}
