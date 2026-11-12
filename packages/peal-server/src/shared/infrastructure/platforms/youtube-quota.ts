// The YouTube Data API's daily quota, as Peal splits it (the quota page,
// developers.google.com/youtube/v3/determine_quota_cost, read 2026-11-12:
// 10,000 units a day for the project, reset at midnight Pacific Time).

/** The units a project has a day, unless Google grants more. */
export const youtubeProjectDailyUnits = 10_000;

/**
 * What the counted shares (comment reads, custom thumbnails) leave by
 * default for what Peal does not count: a person's replies, hides and
 * withdrawals (50 units each), publishing's status reads and lookups, and
 * analytics' reads.
 */
export const youtubeReservedUnits = 2000;

/** What a custom thumbnail costs, about ("approximately 50 units"). */
export const youtubeThumbnailUnits = 50;
