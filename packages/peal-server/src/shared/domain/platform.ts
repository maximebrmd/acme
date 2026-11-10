import { Schema } from "effect";

/**
 * The social networks a channel can connect to. Channels connect accounts on
 * them and publishing checks posts against their rules, so the list lives in
 * the shared kernel.
 */
export const PlatformSchema = Schema.Literals([
  "x",
  "linkedin",
  "bluesky",
  "mastodon",
  "threads",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "pinterest",
  "googleBusiness",
]);

export type Platform = typeof PlatformSchema.Type;

export const platforms: readonly Platform[] = PlatformSchema.literals;
