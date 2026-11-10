import { Option } from "effect";

import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { Platform } from "#shared/domain/platform.ts";

/**
 * The platforms Peal reads counts on: a post on any other has none, and its
 * reader answers `unsupported`. The contract copies the list for clients
 * (`countedPlatforms` in peal-contract), kept equal by a test.
 */
export const countedPlatforms = [
  "mastodon",
  "bluesky",
  "tiktok",
  "youtube",
  "instagram",
  "pinterest",
  // Company pages only: a member's profile has no counts Peal may read.
  "linkedin",
  // Where the operator turned its reads on, which X bills.
  "x",
] as const satisfies readonly Platform[];

/**
 * The reads a platform bills, which the operator turns on: none unless
 * set.
 */
export interface BilledReads {
  /** Whether this server reads counts on X. */
  readonly x: boolean;
}

/** No billed read is on: what a server does unless its operator says. */
export const noBilledReads: BilledReads = { x: false };

/**
 * Whether Peal reads counts on the platform, on a server with these billed
 * reads on.
 */
export const isCounted = (
  platform: Platform,
  billed: BilledReads = noBilledReads
): boolean =>
  countedPlatforms.some((counted) => counted === platform) &&
  (platform !== "x" || billed.x);

/**
 * Whether Peal reads the counts of a channel's posts, from its platform and
 * the way in it came through: on LinkedIn, a company page's only.
 */
export const countsChannel = (
  platform: Platform,
  connection: Option.Option<ChannelConnection>,
  billed: BilledReads = noBilledReads
): boolean =>
  isCounted(platform, billed) &&
  (platform !== "linkedin" || Option.contains(connection, "linkedinPage"));
