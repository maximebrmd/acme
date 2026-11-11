import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { boostPlatforms } from "#ads/application/boosts.ts";
import { unpublishBlocker } from "#publishing/domain/live-post-support.ts";
import { platforms } from "#shared/domain/platform.ts";

// The boost hold (`LivePostHolds`) reads the target's boosts under the
// post's and the target's locks, which creating a boost does not take: a
// boost could start between the check and the deletion. That holds only
// while Peal deletes on no platform it boosts on. The day one joins
// livePostSupport, this fails: make boost creation lock the target and
// refuse one with a pending change first, as the publishing guide says.

describe("the boost hold", () => {
  it("guards no platform where Peal deletes posts", () => {
    expect(
      platforms.filter(
        (platform) =>
          boostPlatforms.has(platform) &&
          Option.isNone(unpublishBlocker(platform))
      )
    ).toStrictEqual([]);
  });
});
