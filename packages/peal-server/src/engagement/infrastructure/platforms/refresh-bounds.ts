import { Option } from "effect";
import type { Duration } from "effect";

import { isEngaged } from "#engagement/domain/engagement-abilities.ts";
import type { EngagedPlatform } from "#engagement/domain/engagement-abilities.ts";
import { youtubeRefreshWithin } from "#engagement/infrastructure/platforms/youtube/youtube-engagement.ts";
import type { Platform } from "#shared/domain/platform.ts";

/**
 * How long each platform lets Peal keep what a read gave without reading
 * it again, where that is shorter than the thread's own retention: none on
 * Mastodon and Bluesky (public posts, kept as the inbox keeps them), nor
 * on Facebook Pages and Instagram (Meta's Platform Terms bound what Peal
 * keeps by the purpose, which the retention serves); 29 days on YouTube
 * (`youtubeRefreshWithin`). Every read's batch carries its platform's.
 */
export const keptWithoutRefresh: Readonly<
  Record<EngagedPlatform, Option.Option<Duration.Duration>>
> = {
  bluesky: Option.none(),
  facebook: Option.none(),
  instagram: Option.none(),
  mastodon: Option.none(),
  youtube: Option.some(youtubeRefreshWithin),
};

/**
 * Whether `platform` bounds how long Peal keeps a comment without reading
 * it again: its comments then leave with a channel that leaves.
 */
export const boundsKeeping = (platform: Platform): boolean =>
  isEngaged(platform) && Option.isSome(keptWithoutRefresh[platform]);
