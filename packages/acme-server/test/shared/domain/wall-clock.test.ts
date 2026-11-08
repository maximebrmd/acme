import { describe, expect, it } from "@effect/vitest";
import { DateTime, Schema } from "effect";

import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  addDays,
  fromWallClock,
  isWeekday,
  LocalDateSchema,
  localDateOf,
} from "#shared/domain/wall-clock.ts";

const paris = TimeZoneIdSchema.make("Europe/Paris");
const newYork = TimeZoneIdSchema.make("America/New_York");

// The transitions these tests use:
//
// - Paris springs forward at 02:00 CET to 03:00 CEST (01:00 UTC) on
//   29 March 2026 and 28 March 2027, and falls back at 03:00 CEST to
//   02:00 CET (01:00 UTC) on 25 October 2026 and 31 October 2027.
// - New York springs forward at 02:00 EST to 03:00 EDT (07:00 UTC) on
//   8 March 2026 and 14 March 2027, and falls back at 02:00 EDT to 01:00 EST
//   (06:00 UTC) on 1 November 2026 and 7 November 2027.
describe(fromWallClock, () => {
  it.each([
    {
      date: { day: 15, month: 1, year: 2026 },
      expected: "2026-01-15T09:00:00.000+01:00[Europe/Paris]",
      label: "keeps an ordinary Paris time",
      time: { hour: 9, minute: 0 },
      zone: paris,
    },
    {
      date: { day: 29, month: 3, year: 2026 },
      expected: "2026-03-29T01:59:00.000+01:00[Europe/Paris]",
      label: "keeps the last minute before the 2026 Paris gap",
      time: { hour: 1, minute: 59 },
      zone: paris,
    },
    {
      date: { day: 29, month: 3, year: 2026 },
      expected: "2026-03-29T03:00:00.000+02:00[Europe/Paris]",
      label: "moves the start of the 2026 Paris gap to 03:00",
      time: { hour: 2, minute: 0 },
      zone: paris,
    },
    {
      date: { day: 29, month: 3, year: 2026 },
      expected: "2026-03-29T03:00:00.000+02:00[Europe/Paris]",
      label: "moves 02:30 in the 2026 Paris gap to 03:00, not 03:30",
      time: { hour: 2, minute: 30 },
      zone: paris,
    },
    {
      date: { day: 29, month: 3, year: 2026 },
      expected: "2026-03-29T03:00:00.000+02:00[Europe/Paris]",
      label: "keeps 03:00 right after the 2026 Paris gap",
      time: { hour: 3, minute: 0 },
      zone: paris,
    },
    {
      date: { day: 25, month: 10, year: 2026 },
      expected: "2026-10-25T02:30:00.000+02:00[Europe/Paris]",
      label: "takes the earlier offset in the 2026 Paris overlap",
      time: { hour: 2, minute: 30 },
      zone: paris,
    },
    {
      date: { day: 25, month: 10, year: 2026 },
      expected: "2026-10-25T03:00:00.000+01:00[Europe/Paris]",
      label: "keeps 03:00 after the 2026 Paris overlap",
      time: { hour: 3, minute: 0 },
      zone: paris,
    },
    {
      date: { day: 28, month: 3, year: 2027 },
      expected: "2027-03-28T03:00:00.000+02:00[Europe/Paris]",
      label: "moves 02:15 in the 2027 Paris gap to 03:00",
      time: { hour: 2, minute: 15 },
      zone: paris,
    },
    {
      date: { day: 31, month: 10, year: 2027 },
      expected: "2027-10-31T02:15:00.000+02:00[Europe/Paris]",
      label: "takes the earlier offset in the 2027 Paris overlap",
      time: { hour: 2, minute: 15 },
      zone: paris,
    },
    {
      date: { day: 8, month: 3, year: 2026 },
      expected: "2026-03-08T03:00:00.000-04:00[America/New_York]",
      label: "moves 02:30 in the 2026 New York gap to 03:00",
      time: { hour: 2, minute: 30 },
      zone: newYork,
    },
    {
      date: { day: 1, month: 11, year: 2026 },
      expected: "2026-11-01T01:30:00.000-04:00[America/New_York]",
      label: "takes the earlier offset in the 2026 New York overlap",
      time: { hour: 1, minute: 30 },
      zone: newYork,
    },
    {
      date: { day: 14, month: 3, year: 2027 },
      expected: "2027-03-14T03:00:00.000-04:00[America/New_York]",
      label: "moves the start of the 2027 New York gap to 03:00",
      time: { hour: 2, minute: 0 },
      zone: newYork,
    },
    {
      date: { day: 7, month: 11, year: 2027 },
      expected: "2027-11-07T01:45:00.000-04:00[America/New_York]",
      label: "takes the earlier offset in the 2027 New York overlap",
      time: { hour: 1, minute: 45 },
      zone: newYork,
    },
  ])("$label", ({ date, expected, time, zone }) => {
    expect(DateTime.formatIsoZoned(fromWallClock(date, time, zone))).toBe(
      expected
    );
  });

  it("lands on the instant the clocks jump", () => {
    const paris2026 = fromWallClock(
      { day: 29, month: 3, year: 2026 },
      { hour: 2, minute: 30 },
      paris
    );

    const newYork2026 = fromWallClock(
      { day: 8, month: 3, year: 2026 },
      { hour: 2, minute: 30 },
      newYork
    );

    expect(DateTime.formatIso(paris2026)).toBe("2026-03-29T01:00:00.000Z");
    expect(DateTime.formatIso(newYork2026)).toBe("2026-03-08T07:00:00.000Z");
  });
});

describe("local dates", () => {
  it.each([
    { date: { day: 29, month: 2, year: 2028 }, valid: true },
    { date: { day: 29, month: 2, year: 2026 }, valid: false },
    { date: { day: 31, month: 4, year: 2026 }, valid: false },
    { date: { day: 0, month: 1, year: 2026 }, valid: false },
    { date: { day: 1, month: 13, year: 2026 }, valid: false },
  ])(
    "tells whether $date.year-$date.month-$date.day exists",
    ({ date, valid }) => {
      expect(Schema.is(LocalDateSchema)(date)).toBe(valid);
    }
  );
});

describe(addDays, () => {
  it.each([
    {
      date: { day: 31, month: 12, year: 2026 },
      days: 1,
      expected: { day: 1, month: 1, year: 2027 },
    },
    {
      date: { day: 1, month: 3, year: 2026 },
      days: -1,
      expected: { day: 28, month: 2, year: 2026 },
    },
    {
      date: { day: 28, month: 3, year: 2026 },
      days: 2,
      expected: { day: 30, month: 3, year: 2026 },
    },
  ])(
    "moves $days days from $date.year-$date.month-$date.day",
    ({ date, days, expected }) => {
      expect(addDays(date, days)).toStrictEqual(expected);
    }
  );
});

describe(isWeekday, () => {
  it("knows daylight saving changes on Sundays", () => {
    expect(isWeekday({ day: 29, month: 3, year: 2026 }, "sunday")).toBeTruthy();
    expect(isWeekday({ day: 1, month: 11, year: 2026 }, "sunday")).toBeTruthy();
    expect(isWeekday({ day: 30, month: 3, year: 2026 }, "sunday")).toBeFalsy();
    expect(isWeekday({ day: 30, month: 3, year: 2026 }, "monday")).toBeTruthy();
  });
});

describe(localDateOf, () => {
  it("reads the date on the zone's wall clock", () => {
    const lateEvening = DateTime.makeUnsafe("2026-03-28T23:30:00Z");

    expect(localDateOf(lateEvening, paris)).toStrictEqual({
      day: 29,
      month: 3,
      year: 2026,
    });
    expect(localDateOf(lateEvening, newYork)).toStrictEqual({
      day: 28,
      month: 3,
      year: 2026,
    });
  });
});
