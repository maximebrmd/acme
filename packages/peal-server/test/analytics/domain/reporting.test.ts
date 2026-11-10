import { Option, Result } from "effect";
import { describe, expect, it } from "vitest";

import { UtcDaySchema } from "#analytics/domain/account-metrics.ts";
import {
  followerChange,
  followersByDay,
} from "#analytics/domain/account-series.ts";
import {
  lastDays,
  previousRange,
  reportRange,
} from "#analytics/domain/report-range.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const day = (written: string) => UtcDaySchema.make(written);

const read = (written: string, followers: number | undefined) => ({
  day: day(written),
  followers: Option.fromUndefinedOr(followers),
});

describe(previousRange, () => {
  it("is the same number of days, ending the day before the range starts", () => {
    const range = Result.getOrThrow(
      reportRange({
        from: { day: 1, month: 3, year: 2027 },
        timeZone: paris,
        to: { day: 7, month: 3, year: 2027 },
      })
    );

    expect(previousRange(range)).toMatchObject({
      from: { day: 22, month: 2, year: 2027 },
      timeZone: paris,
      to: { day: 28, month: 2, year: 2027 },
    });
  });
});

describe(lastDays, () => {
  it("ends today and counts it", () => {
    expect(
      Result.getOrThrow(lastDays({ day: 10, month: 11, year: 2026 }, 7, paris))
    ).toMatchObject({
      from: { day: 4, month: 11, year: 2026 },
      to: { day: 10, month: 11, year: 2026 },
    });
    expect(
      Result.getOrThrow(lastDays({ day: 1, month: 1, year: 2027 }, 90, paris))
    ).toMatchObject({ from: { day: 4, month: 10, year: 2026 } });
  });

  it("is no range before the calendar Peal keeps", () => {
    expect(
      Result.isFailure(lastDays({ day: 3, month: 1, year: 1970 }, 7, paris))
    ).toBeTruthy();
  });
});

describe(followerChange, () => {
  const series = [
    read("2027-02-27", 100),
    read("2027-03-01", 104),
    read("2027-03-02", undefined),
    read("2027-03-05", 120),
    read("2027-03-09", 150),
  ];

  it("counts from the last read before the range to the last one in it", () => {
    expect(
      followerChange(series, day("2027-03-01"), day("2027-03-07"))
    ).toStrictEqual({ current: Option.some(120), gained: Option.some(20) });
  });

  it("counts from the first read in the range for a channel connected during it", () => {
    expect(
      followerChange(series.slice(1), day("2027-03-01"), day("2027-03-07"))
    ).toStrictEqual({ current: Option.some(120), gained: Option.some(16) });
  });

  it("can be a loss, and is unknown where nothing was read", () => {
    expect(
      followerChange(
        [read("2027-03-01", 50), read("2027-03-03", 41)],
        day("2027-03-02"),
        day("2027-03-07")
      )
    ).toStrictEqual({ current: Option.some(41), gained: Option.some(-9) });
    expect(
      followerChange([], day("2027-03-01"), day("2027-03-07"))
    ).toStrictEqual({ current: Option.none(), gained: Option.none() });
    // Read only after the range: nothing was known by its end.
    expect(
      followerChange(series, day("2027-02-01"), day("2027-02-20"))
    ).toStrictEqual({ current: Option.none(), gained: Option.none() });
  });
});

describe(followersByDay, () => {
  it("adds up each channel's last known followers, day by day", () => {
    const days = ["2027-03-01", "2027-03-02", "2027-03-03"].map(day);

    expect(
      followersByDay(
        [
          [read("2027-02-27", 100), read("2027-03-02", 110)],
          [read("2027-03-03", 5)],
          [],
        ],
        days
      )
    ).toStrictEqual([Option.some(100), Option.some(110), Option.some(115)]);
    expect(followersByDay([[read("2027-03-02", 7)]], days)).toStrictEqual([
      Option.none(),
      Option.some(7),
      Option.some(7),
    ]);
  });
});
