import { describe, expect, it } from "@effect/vitest";
import {
  bestTimesHours,
  bestTimesMinimumPosts,
  bestTimesMinimumPostsPerHour,
  bestTimesPeriods as contractBestTimesPeriods,
  bestTimesSettlingHours,
  countedPlatforms as contractCountedPlatforms,
} from "peal-contract";

import {
  bestHours,
  bestTimesPeriods,
  minimumPosts,
  minimumPostsPerHour,
  settlingHours,
} from "#analytics/domain/best-times.ts";
import { countedPlatforms } from "#analytics/domain/counted-platforms.ts";

describe("the contract", () => {
  it("lists the platforms the server reads counts on", () => {
    expect(contractCountedPlatforms).toStrictEqual(countedPlatforms);
  });

  it("says the floors and the days of best times as the server keeps them", () => {
    expect([
      bestTimesMinimumPosts,
      bestTimesMinimumPostsPerHour,
      bestTimesHours,
      bestTimesSettlingHours,
      contractBestTimesPeriods,
    ]).toStrictEqual([
      minimumPosts,
      minimumPostsPerHour,
      bestHours,
      settlingHours,
      bestTimesPeriods,
    ]);
  });
});
