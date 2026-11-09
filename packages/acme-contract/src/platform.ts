import { Schema } from "effect";

/**
 * The social networks a channel can connect to. The server's list
 * (src/channels/domain/platform.ts) is the source; a test keeps the two equal.
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
]).annotate({
  description: "A social network a channel connects to.",
  identifier: "Platform",
});

export type Platform = typeof PlatformSchema.Type;
