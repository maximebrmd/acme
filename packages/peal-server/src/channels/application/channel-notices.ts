import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { Channel } from "#channels/domain/channel.ts";

/**
 * Tells a workspace's members who manage channels that one needs them. Each
 * notice goes out once: sending it again for the same event does nothing.
 * Neither fails; a notice that could not be sent is logged, and the daily
 * check sends it again.
 */
export class ChannelNotices extends Context.Service<
  ChannelNotices,
  {
    /** The channel's token stopped working: reconnect it to post again. */
    readonly reconnectRequired: (channel: Channel) => Effect.Effect<void>;
    /** The channel's token cannot be renewed and expires at `expiresAt`. */
    readonly reconnectSoon: (
      channel: Channel,
      expiresAt: DateTime.Utc
    ) => Effect.Effect<void>;
  }
>()("acme-server/channels/application/ChannelNotices") {}
