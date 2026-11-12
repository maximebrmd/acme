import { describe, expect, it } from "@effect/vitest";

import { youtubeCommentsDailyUnits } from "#engagement/infrastructure/platforms/youtube/youtube-engagement.ts";
import { defaultDailyThumbnails } from "#publishing/infrastructure/platforms/youtube/youtube-settings.ts";
import {
  youtubeProjectDailyUnits,
  youtubeReservedUnits,
  youtubeThumbnailUnits,
} from "#shared/infrastructure/platforms/youtube-quota.ts";

// The project's 10,000 daily units of the YouTube Data API are shared by
// what Peal counts (comment reads, custom thumbnails) and what it does
// not (a person's replies, hides and withdrawals, publishing's status
// reads and lookups, analytics): the counted defaults leave a reserve.

describe("YouTube's daily quota, by default", () => {
  it("leaves the reserve to what Peal does not count", () => {
    expect(
      youtubeCommentsDailyUnits + defaultDailyThumbnails * youtubeThumbnailUnits
    ).toBeLessThanOrEqual(youtubeProjectDailyUnits - youtubeReservedUnits);
    expect(youtubeReservedUnits).toBeGreaterThanOrEqual(2000);
  });

  it("gives comment reads 3,000 units", () => {
    expect(youtubeCommentsDailyUnits).toBe(3000);
  });
});
