import { Context } from "effect";
import type { Effect } from "effect";

import type { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

/** What engagement needs to know of a channel: where it is, and what its account allowed. */
export interface EngagedChannel {
  readonly platform: Platform;
  readonly scopes: readonly string[];
}

/** The channels, from the channels context. */
export class EngagementChannels extends Context.Service<
  EngagementChannels,
  {
    /** The channel, when it is connected, on and working. */
    readonly describe: (
      channelId: ChannelId
    ) => Effect.Effect<EngagedChannel, ChannelUnreadable | DatabaseError>;
  }
>()("peal-server/engagement/application/EngagementChannels") {}
