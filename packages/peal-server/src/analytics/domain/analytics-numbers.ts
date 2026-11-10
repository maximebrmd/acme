import type { Option } from "effect";

import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { countsChannel, noBilledReads } from "./counted-platforms.ts";
import type { BilledReads } from "./counted-platforms.ts";

// Which numbers Peal reads where, so clients say what a channel has before
// anything is read: a number left out is one the platform does not give,
// or one Peal may not read there.

/** A count of a post. */
export type PostCount =
  | "clicks"
  | "impressions"
  | "likes"
  | "quotes"
  | "reach"
  | "replies"
  | "reposts"
  | "saves";

/** A number of an account. */
export type AccountNumber =
  | "followers"
  | "following"
  | "posts"
  | "reach"
  | "views";

const basics = ["likes", "reposts", "replies"] as const;

/**
 * The counts each platform's reader gives of a post, with what the account
 * grants Peal today. Facebook Pages' views and clicks need a permission
 * Peal does not ask for yet, so they are not listed.
 */
export const postCounts: Readonly<Record<Platform, readonly PostCount[]>> = {
  bluesky: [...basics, "quotes"],
  facebook: basics,
  googleBusiness: [],
  instagram: [...basics, "impressions"],
  linkedin: [...basics, "impressions", "clicks", "reach"],
  mastodon: [...basics, "quotes"],
  pinterest: [...basics, "impressions"],
  threads: [...basics, "quotes", "impressions"],
  tiktok: [...basics, "impressions"],
  x: [...basics, "quotes", "impressions", "saves"],
  youtube: [...basics, "impressions"],
};

/**
 * The numbers each platform's reader gives of an account: followers day by
 * day, and views and reach by day where the platform has account insights
 * Peal reads.
 */
export const accountNumbers: Readonly<
  Record<Platform, readonly AccountNumber[]>
> = {
  bluesky: ["followers", "following", "posts"],
  facebook: ["followers"],
  googleBusiness: [],
  instagram: ["followers", "following", "posts"],
  linkedin: ["followers", "views", "reach"],
  mastodon: ["followers", "following", "posts"],
  pinterest: ["followers", "following", "posts", "views"],
  threads: ["followers"],
  tiktok: ["followers", "following", "posts"],
  x: ["followers", "following", "posts"],
  youtube: ["followers", "posts"],
};

/** The numbers of a channel: of its posts, and of its account. */
export interface AnalyticsNumbers {
  readonly account: readonly AccountNumber[];
  readonly post: readonly PostCount[];
}

/** Nothing is read. */
export const noNumbers: AnalyticsNumbers = { account: [], post: [] };

/**
 * The numbers Peal reads on a channel, from its platform and the way in
 * it came through, on a server with these billed reads on: none where it
 * reads no counts.
 */
export const numbersOf = (
  platform: Platform,
  connection: Option.Option<ChannelConnection>,
  billed: BilledReads = noBilledReads
): AnalyticsNumbers =>
  countsChannel(platform, connection, billed)
    ? { account: accountNumbers[platform], post: postCounts[platform] }
    : noNumbers;
