import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import {
  defaultUsageRangeDays,
  maxUsageRangeDays,
  reportOf,
  usageCutoff,
  usageDayOf,
  usagePeriodOf,
} from "#billing/domain/usage-meter.ts";
import type { UsageRecord } from "#billing/domain/usage-meter.ts";

const day = (written: string) => DateTime.makeUnsafe(`${written}T00:00:00Z`);

const published = (
  on: string,
  platform: "bluesky" | "x",
  quantity: number
): UsageRecord => ({
  day: day(on),
  dimension: platform,
  meter: "publishedPosts",
  quantity,
});

const state = (
  on: string,
  meter: "assistantRequests" | "channels" | "mediaStorage" | "members",
  quantity: number
): UsageRecord => ({ day: day(on), dimension: "", meter, quantity });

describe("usage days", () => {
  it("count an instant in its UTC day", () => {
    expect(
      usageDayOf(DateTime.makeUnsafe("2026-10-31T23:59:59.999Z"))
    ).toStrictEqual(day("2026-10-31"));
    expect(
      usageDayOf(DateTime.makeUnsafe("2026-11-01T00:00:00Z"))
    ).toStrictEqual(day("2026-11-01"));
  });

  it("purge what is older than 400 days", () => {
    expect(
      usageCutoff(DateTime.makeUnsafe("2026-11-11T00:11:00Z"))
    ).toStrictEqual(day("2025-10-07"));
  });
});

describe("usage periods", () => {
  const now = DateTime.makeUnsafe("2026-11-11T15:00:00Z");

  it("are the last 30 days ending today by default", () => {
    const period = usagePeriodOf(
      { from: Option.none(), to: Option.none() },
      now
    );

    expect(period).toStrictEqual(
      Result.succeed({ from: day("2026-10-13"), to: day("2026-11-11") })
    );
    expect(defaultUsageRangeDays).toBe(30);
  });

  it("end on the day given, or start on it", () => {
    expect(
      usagePeriodOf(
        { from: Option.none(), to: Option.some(day("2026-10-31")) },
        now
      )
    ).toStrictEqual(
      Result.succeed({ from: day("2026-10-02"), to: day("2026-10-31") })
    );
    expect(
      usagePeriodOf(
        { from: Option.some(day("2026-11-01")), to: Option.none() },
        now
      )
    ).toStrictEqual(
      Result.succeed({ from: day("2026-11-01"), to: day("2026-11-11") })
    );
  });

  it("take up to 92 days, both ends included", () => {
    expect(maxUsageRangeDays).toBe(92);
    expect(
      Result.isSuccess(
        usagePeriodOf(
          {
            from: Option.some(day("2026-08-01")),
            to: Option.some(day("2026-10-31")),
          },
          now
        )
      )
    ).toBeTruthy();
    expect(
      Result.isFailure(
        usagePeriodOf(
          {
            from: Option.some(day("2026-07-31")),
            to: Option.some(day("2026-10-31")),
          },
          now
        )
      )
    ).toBeTruthy();
  });

  it("refuse a range that ends before it starts", () => {
    expect(
      Result.isFailure(
        usagePeriodOf(
          {
            from: Option.some(day("2026-11-02")),
            to: Option.some(day("2026-11-01")),
          },
          now
        )
      )
    ).toBeTruthy();
  });

  it("refuse a default end before a start given in the future", () => {
    expect(
      Result.isFailure(
        usagePeriodOf(
          { from: Option.some(day("2026-11-12")), to: Option.none() },
          now
        )
      )
    ).toBeTruthy();
  });
});

describe("usage reports", () => {
  const period = { from: day("2026-10-30"), to: day("2026-11-02") };

  it("fill the days without records, oldest first", () => {
    const report = reportOf([], period);

    expect(report.days.map(({ day: at }) => at)).toStrictEqual([
      day("2026-10-30"),
      day("2026-10-31"),
      day("2026-11-01"),
      day("2026-11-02"),
    ]);
    expect(report.days[0]).toStrictEqual({
      assistantRequests: 0,
      byPlatform: [],
      channels: Option.none(),
      day: day("2026-10-30"),
      mediaStorage: Option.none(),
      members: Option.none(),
      publishedPosts: 0,
    });
    expect(report.totals).toStrictEqual({
      byPlatform: [],
      channelDays: 0,
      daysCounted: 0,
      publishedPosts: 0,
    });
  });

  it("sum each day's posts by platform, and the period's", () => {
    const report = reportOf(
      [
        published("2026-10-31", "x", 2),
        published("2026-10-31", "bluesky", 1),
        published("2026-11-02", "bluesky", 4),
        state("2026-10-31", "assistantRequests", 7),
      ],
      period
    );

    expect(report.days[1]).toMatchObject({
      assistantRequests: 7,
      byPlatform: [
        { platform: "bluesky", posts: 1 },
        { platform: "x", posts: 2 },
      ],
      publishedPosts: 3,
    });
    expect(report.totals).toMatchObject({
      byPlatform: [
        { platform: "bluesky", posts: 5 },
        { platform: "x", posts: 2 },
      ],
      publishedPosts: 7,
    });
  });

  it("keep each day's states, and leave the days without one out of the channel-days", () => {
    const report = reportOf(
      [
        state("2026-10-30", "channels", 3),
        state("2026-10-30", "members", 2),
        state("2026-10-30", "mediaStorage", 1_500_000_000),
        state("2026-11-01", "channels", 5),
        state("2026-11-02", "channels", 0),
      ],
      period
    );

    expect(report.days.map(({ channels }) => channels)).toStrictEqual([
      Option.some(3),
      Option.none(),
      Option.some(5),
      Option.some(0),
    ]);
    expect(report.days[0]).toMatchObject({
      mediaStorage: Option.some(1_500_000_000),
      members: Option.some(2),
    });
    expect(report.totals).toMatchObject({ channelDays: 8, daysCounted: 3 });
  });

  it("ignore records outside the period", () => {
    const report = reportOf(
      [published("2026-10-29", "x", 9), state("2026-11-03", "channels", 9)],
      period
    );

    expect(report.totals).toStrictEqual({
      byPlatform: [],
      channelDays: 0,
      daysCounted: 0,
      publishedPosts: 0,
    });
  });
});
