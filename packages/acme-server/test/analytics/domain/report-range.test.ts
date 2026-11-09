import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { engagementOf, PostMetrics } from "#analytics/domain/post-metrics.ts";
import {
  dayStarts,
  reportDays,
  reportRange,
} from "#analytics/domain/report-range.ts";
import type { ReportRange } from "#analytics/domain/report-range.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const rangeOf = (
  from: ReportRange["from"],
  to: ReportRange["to"],
  timeZone = paris
) => reportRange({ from, timeZone, to });

describe(reportRange, () => {
  it("takes a range of one day to a year", () => {
    expect(
      Result.isSuccess(
        rangeOf(
          { day: 9, month: 11, year: 2026 },
          { day: 9, month: 11, year: 2026 }
        )
      )
    ).toBeTruthy();

    expect(
      Result.isSuccess(
        rangeOf(
          { day: 1, month: 1, year: 2028 },
          { day: 31, month: 12, year: 2028 }
        )
      )
    ).toBeTruthy();
  });

  it("refuses a range that ends before it starts, or spans more", () => {
    const backwards = rangeOf(
      { day: 9, month: 11, year: 2026 },
      { day: 8, month: 11, year: 2026 }
    );

    const long = rangeOf(
      { day: 1, month: 1, year: 2026 },
      { day: 2, month: 1, year: 2027 }
    );

    expect(Result.isFailure(backwards)).toBeTruthy();
    expect(
      Result.match(long, {
        onFailure: ({ days }) => days,
        onSuccess: () => 0,
      })
    ).toBe(367);
  });
});

describe(dayStarts, () => {
  it("starts each day at midnight in the zone, across a clock change", () => {
    const range = Result.getOrThrow(
      rangeOf(
        { day: 24, month: 10, year: 2026 },
        { day: 26, month: 10, year: 2026 }
      )
    );

    expect(reportDays(range)).toHaveLength(3);

    // Paris falls back on 25 October 2026: that day lasts 25 hours.
    expect(dayStarts(range).map(DateTime.formatIso)).toStrictEqual([
      "2026-10-23T22:00:00.000Z",
      "2026-10-24T22:00:00.000Z",
      "2026-10-25T23:00:00.000Z",
      "2026-10-26T23:00:00.000Z",
    ]);
  });
});

describe(engagementOf, () => {
  it("adds likes, reposts, replies and quotes, not impressions", () => {
    expect(
      engagementOf(
        new PostMetrics({
          impressions: Option.some(1000),
          likes: 5,
          quotes: Option.some(2),
          replies: 3,
          reposts: 4,
        })
      )
    ).toBe(14);

    expect(
      engagementOf(
        new PostMetrics({
          impressions: Option.none(),
          likes: 5,
          quotes: Option.none(),
          replies: 0,
          reposts: 1,
        })
      )
    ).toBe(6);
  });
});
