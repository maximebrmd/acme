import type { Platform } from "#shared/domain/platform.ts";

/**
 * The platforms Acme reads counts on: a post on any other has none, and its
 * reader answers `unsupported`. The contract copies the list for clients
 * (`countedPlatforms` in acme-contract), kept equal by a test.
 */
export const countedPlatforms = [
  "mastodon",
  "bluesky",
  "tiktok",
  "youtube",
] as const satisfies readonly Platform[];

/** Whether Acme reads counts on the platform. */
export const isCounted = (platform: Platform): boolean =>
  countedPlatforms.some((counted) => counted === platform);
