import type { Channel } from "#channels/domain/channel.ts";
import { isSocialPlatform } from "#channels/domain/platform.ts";
import type { Platform } from "#channels/domain/platform.ts";

/** A channel of a social network, which takes posts. */
export type SocialChannel = Channel & { readonly platform: Platform };

/**
 * Whether the channel is a social network's rather than a website's: what
 * reads a channel for a post leaves a website's out.
 */
export const isSocialChannel = (channel: Channel): channel is SocialChannel =>
  isSocialPlatform(channel.platform);
