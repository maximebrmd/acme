import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import {
  isAhead,
  startAtOf,
  startChoiceOf,
  startTimeOn,
} from "#posts/start-time.ts";

const paris = "Europe/Paris";

// 10 November 2026, 14:20 in Paris (UTC+1).
const now = DateTime.makeUnsafe("2026-11-10T13:20:00Z");

describe(startAtOf, () => {
  it("writes a date and a time as the composer's address takes them", () => {
    expect(
      startAtOf({ day: 5, month: 3, year: 2027 }, { hour: 9, minute: 0 })
    ).toBe("2027-03-05T09:00");
  });
});

describe(startChoiceOf, () => {
  it("reads a time to come on the viewer's clock", () => {
    expect(startChoiceOf("2026-11-12T09:00", paris, now)).toStrictEqual(
      Option.some({
        date: { day: 12, month: 11, year: 2026 },
        time: "09:00",
        timeZone: paris,
      })
    );
  });

  it("reads a time later the same day", () => {
    expect(
      Option.isSome(startChoiceOf("2026-11-10T15:00", paris, now))
    ).toBeTruthy();
  });

  it.each([
    ["nothing", undefined],
    ["an empty value", ""],
    ["a date alone", "2026-11-12"],
    ["seconds", "2026-11-12T09:00:00"],
    ["an offset", "2026-11-12T09:00+01:00"],
    ["an hour the clock lacks", "2026-11-12T24:00"],
    ["a day the calendar lacks", "2026-02-30T09:00"],
    ["words", "tomorrow"],
    ["a time that has passed today", "2026-11-10T14:00"],
    ["a day that has passed", "2026-11-09T18:00"],
  ])("ignores %s", (_, at) => {
    expect(startChoiceOf(at, paris, now)).toStrictEqual(Option.none());
  });

  it("ignores a zone that does not exist", () => {
    expect(
      startChoiceOf("2026-11-12T09:00", "Mars/Olympus", now)
    ).toStrictEqual(Option.none());
  });
});

describe(isAhead, () => {
  it("tells an hour to come from one that started", () => {
    const today = { day: 10, month: 11, year: 2026 };

    expect(isAhead(today, { hour: 15, minute: 0 }, paris, now)).toBeTruthy();
    expect(isAhead(today, { hour: 14, minute: 0 }, paris, now)).toBeFalsy();
  });
});

describe(startTimeOn, () => {
  it("starts a day to come at nine", () => {
    expect(
      startTimeOn({ day: 11, month: 11, year: 2026 }, paris, now)
    ).toStrictEqual(Option.some({ hour: 9, minute: 0 }));
  });

  it("starts today at the next full hour, once nine has passed", () => {
    expect(
      startTimeOn({ day: 10, month: 11, year: 2026 }, paris, now)
    ).toStrictEqual(Option.some({ hour: 15, minute: 0 }));
  });

  it("starts nothing on a day that is over, or in today's last hour", () => {
    expect(
      startTimeOn({ day: 9, month: 11, year: 2026 }, paris, now)
    ).toStrictEqual(Option.none());

    expect(
      startTimeOn(
        { day: 10, month: 11, year: 2026 },
        paris,
        DateTime.makeUnsafe("2026-11-10T22:30:00Z")
      )
    ).toStrictEqual(Option.none());
  });
});
