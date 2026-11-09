import { Option } from "effect";
import type { Channel as ChannelView } from "peal-contract";

import type { Channel } from "#channels/domain/channel.ts";

/**
 * What clients see of a channel: never its tokens. The expiry shown is the
 * one the user must reconnect by; a token that renews itself has none.
 */
export const toChannelView = (channel: Channel): ChannelView => ({
  avatarUrl: Option.getOrNull(channel.avatarUrl),
  displayName: Option.getOrNull(channel.displayName),
  handle: channel.handle,
  id: channel.id,
  platform: channel.platform,
  status: channel.status,
  tokenExpiresAt:
    channel.token._tag === "nonRefreshable" ? channel.token.expiresAt : null,
});
