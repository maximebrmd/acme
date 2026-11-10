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
] as const satisfies readonly Platform[];

/** Whether Peal reads counts on the platform. */
export const isCounted = (platform: Platform): boolean =>
  countedPlatforms.some((counted) => counted === platform);

/**
 * Whether Peal reads the counts of a channel's posts, from its platform and
 * the way in it came through: on LinkedIn, a company page's only.
 */
export const countsChannel = (
  platform: Platform,
  connection: Option.Option<ChannelConnection>
): boolean =>
  isCounted(platform) &&
  (platform !== "linkedin" || Option.contains(connection, "linkedinPage"));
