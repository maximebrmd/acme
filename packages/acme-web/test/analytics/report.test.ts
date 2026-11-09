import { describe, expect, it } from "@effect/vitest";
import type { AnalyticsSummary } from "acme-contract";
import { DateTime } from "effect";

import {
  dayDate,
  engagementOf,
  isEmpty,
  rangeEnding,
  readingRows,
  shownKeys,
} from "#analytics/report.ts";

const summaryWith = (quotes: number | null, posts = 1): AnalyticsSummary => ({
  channels: [],
  days: [],
  from: "2026-11-03",
  timeZone: "Europe/Paris",
  to: "2026-11-09",
  topPosts: [],
  totals: {
    impressions: null,
    likes: 4,
    posts,
    quotes,
    replies: 1,
    reposts: 2,
  },
});

describe(rangeEnding, () => {
  it("ends on today, which it counts", () => {
    expect(
      rangeEnding({ day: 9, month: 11, year: 2026 }, "7", "Europe/Paris")
    ).toStrictEqual({
      from: "2026-11-03",
      timeZone: "Europe/Paris",
      to: "2026-11-09",
    });

    expect(
      rangeEnding({ day: 1, month: 3, year: 2028 }, "30", "America/New_York")
    ).toStrictEqual({
      // 2028 is a leap year: February has 29 days.
      from: "2028-02-01",
      timeZone: "America/New_York",
      to: "2028-03-01",
    });
  });
});

describe(dayDate, () => {
  it("puts a day at midnight UTC, to be written in UTC", () => {
    expect(dayDate("2026-11-09").toISOString()).toBe(
      "2026-11-09T00:00:00.000Z"
    );
  });
});

describe(shownKeys, () => {
  it("draws quotes only where a platform counts them", () => {
    expect(shownKeys(summaryWith(null))).toStrictEqual([
      "likes",
      "reposts",
      "replies",
    ]);
    expect(shownKeys(summaryWith(0))).toStrictEqual([
      "likes",
      "reposts",
      "replies",
      "quotes",
    ]);
  });

  it("knows a range where nothing went out", () => {
    expect(isEmpty(summaryWith(null, 0))).toBeTruthy();
    expect(isEmpty(summaryWith(null, 1))).toBeFalsy();
  });
});

describe(engagementOf, () => {
  it("adds likes, reposts, replies and quotes, not impressions", () => {
    expect(
      engagementOf({
        impressions: 900,
        likes: 3,
        quotes: null,
        replies: 2,
        reposts: 1,
      })
    ).toBe(6);
  });
});

describe(readingRows, () => {
  it("draws each reading at its instant, quotes as zero when none", () => {
    expect(
      readingRows([
        {
          collectedAt: DateTime.makeUnsafe("2026-11-09T10:07:00.000Z"),
          metrics: {
            impressions: null,
            likes: 3,
            quotes: null,
            replies: 0,
            reposts: 1,
          },
        },
      ])
    ).toStrictEqual([
      {
        at: Date.UTC(2026, 10, 9, 10, 7),
        likes: 3,
        quotes: 0,
        replies: 0,
        reposts: 1,
      },
    ]);
  });
});
