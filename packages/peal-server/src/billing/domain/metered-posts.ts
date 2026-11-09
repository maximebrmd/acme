import { DateTime } from "effect";

import type { Platform } from "#shared/domain/platform.ts";

/**
 * The platforms that bill the server for each post its app makes: X, paid
 * per use, where a post with a link costs about 13 times one without
 * (2026). Billing counts each workspace's posts on them, and those with a
 * link, by calendar month (UTC), so that plans can limit them; none does
 * yet.
 */
export const meteredPlatforms: ReadonlySet<Platform> = new Set<Platform>(["x"]);

/** Whether the platform bills the server for each post. */
export const isMetered = (platform: Platform): boolean =>
  meteredPlatforms.has(platform);

/**
 * The calendar month (UTC) a post that went out at `instant` counts in, by
 * its first instant.
 */
export const meteringMonthOf = (instant: DateTime.Utc): DateTime.Utc =>
  DateTime.startOf(instant, "month");

/**
 * How many posts a workspace made on a metered platform in a month, and
 * how many of them held a link.
 */
export interface MeteredPostCount {
  readonly month: DateTime.Utc;
  readonly platform: Platform;
  readonly posts: number;
  readonly postsWithLinks: number;
}
