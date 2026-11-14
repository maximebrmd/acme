import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import {
  nextReviewRead,
  recordReviewRead,
} from "#engagement/domain/review-thread.ts";
import { reviewedAt, reviewThread } from "#test/engagement/support.ts";

describe("a location's reviews", () => {
  it("are read at the first run after the location is followed", () => {
    expect(reviewThread().nextReadAt).toStrictEqual(reviewedAt);
  });

  it("are read hourly while one was written or changed in the last week, every six hours otherwise", () => {
    const recent = DateTime.subtractDuration(reviewedAt, "6 days");
    const older = DateTime.subtractDuration(reviewedAt, "8 days");

    expect(nextReviewRead(Option.some(recent), reviewedAt)).toStrictEqual(
      DateTime.addDuration(reviewedAt, "1 hour")
    );
    expect(nextReviewRead(Option.some(older), reviewedAt)).toStrictEqual(
      DateTime.addDuration(reviewedAt, "6 hours")
    );
    expect(nextReviewRead(Option.none(), reviewedAt)).toStrictEqual(
      DateTime.addDuration(reviewedAt, "6 hours")
    );
  });

  it("keep what the platform says of the location as a whole", () => {
    const read = recordReviewRead(
      reviewThread(),
      { averageRating: Option.some(4.5), totalReviewCount: Option.some(12) },
      Option.none(),
      reviewedAt,
      reviewedAt
    );

    expect(read.averageRating).toStrictEqual(Option.some(4.5));
    expect(read.totalReviewCount).toStrictEqual(Option.some(12));
    expect(read.lastReadAt).toStrictEqual(Option.some(reviewedAt));
  });
});
