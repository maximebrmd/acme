import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";

import {
  calendarDays,
  commitmentOf,
  committedIn,
  monthsTouched,
} from "#ads/domain/commitment.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

const paris = TimeZoneIdSchema.make("Europe/Paris");
const utc = TimeZoneIdSchema.make("Etc/UTC");
const at = (iso: string) => DateTime.makeUnsafe(iso);

describe(calendarDays, () => {
  it("counts both ends of a run", () => {
    expect(
      calendarDays(at("2026-11-10T12:00:00Z"), at("2026-11-12T12:00:00Z"), utc)
    ).toBe(3);
  });

  it("counts the days of the account's zone, not UTC's", () => {
    // 22:30 UTC on the 10th is already the 11th in Paris.
    expect(
      calendarDays(at("2026-11-10T22:30:00Z"), at("2026-11-10T23:30:00Z"), utc)
    ).toBe(1);
    expect(
      calendarDays(
        at("2026-11-10T22:30:00Z"),
        at("2026-11-10T23:30:00Z"),
        paris
      )
    ).toBe(2);
  });
});

describe(monthsTouched, () => {
  it("names one month for a run inside it", () => {
    expect(
      monthsTouched(at("2026-11-10T00:00:00Z"), at("2026-11-20T00:00:00Z"), utc)
    ).toStrictEqual(["2026-11"]);
  });

  it("names every month a run crosses, the year's end included", () => {
    expect(
      monthsTouched(at("2026-11-25T00:00:00Z"), at("2027-01-05T00:00:00Z"), utc)
    ).toStrictEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("follows the account's zone at a month's edge", () => {
    // 23:30 UTC on 30 November is 1 December in Paris.
    expect(
      monthsTouched(
        at("2026-11-30T23:30:00Z"),
        at("2026-11-30T23:45:00Z"),
        paris
      )
    ).toStrictEqual(["2026-12"]);
  });
});

describe(commitmentOf, () => {
  it("commits a total budget whole", () => {
    expect(
      commitmentOf(
        { _tag: "total", amount: 5000 },
        at("2026-11-10T12:00:00Z"),
        at("2026-11-17T12:00:00Z"),
        utc
      )
    ).toBe(5000);
  });

  it("commits a daily budget as the network may spend it: 175% a day, 7 days' worth a calendar week", () => {
    // Tuesday 10 to Tuesday 17 November: five days of the week that ends
    // on Saturday 14, capped at 7 days' worth, then three days of the next.
    expect(
      commitmentOf(
        { _tag: "daily", amount: 1000 },
        at("2026-11-10T12:00:00Z"),
        at("2026-11-17T12:00:00Z"),
        utc
      )
    ).toBe(12_250);
  });

  it("commits a short run at 175% of each day's budget", () => {
    // Two days of 100.00: up to 175.00 on each.
    expect(
      commitmentOf(
        { _tag: "daily", amount: 10_000 },
        at("2026-11-10T09:00:00Z"),
        at("2026-11-11T09:00:00Z"),
        utc
      )
    ).toBe(35_000);
  });

  it("commits a whole week, Sunday to Saturday, at 7 days' worth", () => {
    expect(
      commitmentOf(
        { _tag: "daily", amount: 1000 },
        at("2026-11-08T00:00:00Z"),
        at("2026-11-14T23:00:00Z"),
        utc
      )
    ).toBe(7000);
  });

  it("counts the weeks in the account's zone", () => {
    // Saturday 23:30 in UTC is Sunday in Auckland: a new week there.
    expect(
      commitmentOf(
        { _tag: "daily", amount: 1000 },
        at("2026-11-07T23:30:00Z"),
        at("2026-11-07T23:45:00Z"),
        TimeZoneIdSchema.make("Pacific/Auckland")
      )
    ).toBe(1750);
  });

  it("rounds a daily commitment up", () => {
    expect(
      commitmentOf(
        { _tag: "daily", amount: 333 },
        at("2026-11-10T00:00:00Z"),
        at("2026-11-10T23:00:00Z"),
        utc
      )
    ).toBe(583);
  });
});

const run = (from: string, to: string, committed: number) => ({
  committed,
  from: at(from),
  to: at(to),
});

describe(committedIn, () => {
  it("sums the runs that touch the month", () => {
    expect(
      committedIn(
        ["2026-11"],
        [
          run("2026-11-01T00:00:00Z", "2026-11-05T00:00:00Z", 1000),
          run("2026-11-20T00:00:00Z", "2026-12-02T00:00:00Z", 2000),
          run("2026-12-05T00:00:00Z", "2026-12-09T00:00:00Z", 4000),
        ],
        utc
      )
    ).toBe(3000);
  });

  it("answers the fullest of the months asked", () => {
    expect(
      committedIn(
        ["2026-11", "2026-12"],
        [
          run("2026-11-01T00:00:00Z", "2026-11-05T00:00:00Z", 1000),
          run("2026-11-20T00:00:00Z", "2026-12-02T00:00:00Z", 2000),
          run("2026-12-05T00:00:00Z", "2026-12-09T00:00:00Z", 4000),
        ],
        utc
      )
    ).toBe(6000);
  });

  it("answers nothing for a month no run touches", () => {
    expect(committedIn(["2027-03"], [], utc)).toBe(0);
  });
});
