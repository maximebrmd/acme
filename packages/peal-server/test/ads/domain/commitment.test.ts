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

  it("commits a daily budget for every day touched, with the share the network may add", () => {
    // 8 calendar days, 10.00 a day, a quarter more on any of them.
    expect(
      commitmentOf(
        { _tag: "daily", amount: 1000 },
        at("2026-11-10T12:00:00Z"),
        at("2026-11-17T12:00:00Z"),
        utc
      )
    ).toBe(10_000);
  });

  it("rounds a daily commitment up", () => {
    expect(
      commitmentOf(
        { _tag: "daily", amount: 333 },
        at("2026-11-10T00:00:00Z"),
        at("2026-11-10T23:00:00Z"),
        utc
      )
    ).toBe(417);
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
