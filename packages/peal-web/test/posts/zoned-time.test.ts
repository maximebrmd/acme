import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Schema } from "effect";

import {
  addMonths,
  dateKey,
  DateKeySchema,
  instantOf,
  monthOf,
  movedTo,
  parseDate,
  parseTime,
  rangeOf,
  timeKey,
  wallClockOf,
  weekOf,
} from "#posts/zoned-time.ts";
import type { CalendarDate } from "#posts/zoned-time.ts";

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const iso = (instant: Option.Option<DateTime.Utc>) =>
  instant.pipe(Option.map(DateTime.formatIso));

const on = (year: number, month: number, day: number): CalendarDate => ({
  day,
  month,
  year,
});

describe(instantOf, () => {
  it("reads a wall clock in its zone", () => {
    expect(
      iso(
        instantOf(
          { date: on(2026, 6, 16), time: { hour: 9, minute: 30 } },
          "Europe/Paris"
        )
      )
    ).toStrictEqual(Option.some("2026-06-16T07:30:00.000Z"));

    expect(
      iso(
        instantOf(
          { date: on(2026, 1, 16), time: { hour: 9, minute: 30 } },
          "America/New_York"
        )
      )
    ).toStrictEqual(Option.some("2026-01-16T14:30:00.000Z"));
  });

  // As the server does: 02:30 does not exist on 29 March 2026 in Paris.
  it("moves a time the clocks skip to the moment they jump", () => {
    expect(
      iso(
        instantOf(
          { date: on(2026, 3, 29), time: { hour: 2, minute: 30 } },
          "Europe/Paris"
        )
      )
    ).toStrictEqual(Option.some("2026-03-29T01:00:00.000Z"));
  });

  it("takes the earlier of a time the clocks repeat", () => {
    expect(
      iso(
        instantOf(
          { date: on(2026, 10, 25), time: { hour: 2, minute: 30 } },
          "Europe/Paris"
        )
      )
    ).toStrictEqual(Option.some("2026-10-25T00:30:00.000Z"));
  });

  it.each([
    {
      label: "an unknown zone",
      timeZone: "Mars/Olympus_Mons",
      wall: on(2026, 6, 16),
    },
    {
      label: "a date off the calendar",
      timeZone: "Europe/Paris",
      wall: on(2026, 2, 30),
    },
  ])("names nothing for $label", ({ timeZone, wall }) => {
    expect(
      instantOf({ date: wall, time: { hour: 9, minute: 0 } }, timeZone)
    ).toStrictEqual(Option.none());
  });
});

describe(wallClockOf, () => {
  it("shows an instant on the clock of each zone", () => {
    const instant = utc("2026-06-16T23:30:00Z");

    expect(wallClockOf(instant, "Europe/Paris")).toStrictEqual(
      Option.some({ date: on(2026, 6, 17), time: { hour: 1, minute: 30 } })
    );
    expect(wallClockOf(instant, "America/Los_Angeles")).toStrictEqual(
      Option.some({ date: on(2026, 6, 16), time: { hour: 16, minute: 30 } })
    );
  });
});

describe(weekOf, () => {
  it("starts the week on the locale's first day", () => {
    const wednesday = on(2026, 6, 17);

    expect(weekOf(wednesday, 1).map(dateKey)).toStrictEqual([
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21",
    ]);
    expect(weekOf(wednesday, 7).map(dateKey).at(0)).toBe("2026-06-14");
  });
});

describe(monthOf, () => {
  it("shows whole weeks around the month", () => {
    const days = monthOf(on(2026, 6, 17), 1);

    expect(dateKey(days[0] ?? on(0, 1, 1))).toBe("2026-06-01");
    expect(dateKey(days.at(-1) ?? on(0, 1, 1))).toBe("2026-07-05");
    expect(days).toHaveLength(35);
  });

  it("crosses into the next year", () => {
    const days = monthOf(on(2026, 12, 9), 7);

    expect(dateKey(days[0] ?? on(0, 1, 1))).toBe("2026-11-29");
    expect(dateKey(days.at(-1) ?? on(0, 1, 1))).toBe("2027-01-02");
    expect(addMonths(on(2026, 12, 9), 1)).toStrictEqual(on(2027, 1, 1));
    expect(addMonths(on(2026, 1, 9), -1)).toStrictEqual(on(2025, 12, 1));
  });
});

describe(rangeOf, () => {
  it("spans the days from midnight to midnight in the zone", () => {
    const range = rangeOf(weekOf(on(2026, 6, 17), 1), "Europe/Paris").pipe(
      Option.map(({ from, to }) => [
        DateTime.formatIso(from),
        DateTime.formatIso(to),
      ])
    );

    expect(range).toStrictEqual(
      Option.some(["2026-06-14T22:00:00.000Z", "2026-06-21T22:00:00.000Z"])
    );
  });
});

describe(movedTo, () => {
  const post = utc("2026-06-16T07:45:00Z");

  it("moves to an hour of another day, keeping the minutes", () => {
    expect(
      iso(movedTo(post, "Europe/Paris", on(2026, 6, 18), 14))
    ).toStrictEqual(Option.some("2026-06-18T12:45:00.000Z"));
  });

  it("moves to another day at the same time of day, on the viewer's clock", () => {
    expect(
      iso(movedTo(post, "America/New_York", on(2026, 6, 20)))
    ).toStrictEqual(Option.some("2026-06-20T07:45:00.000Z"));
  });

  it("keeps the wall clock across a change of offset", () => {
    expect(
      iso(movedTo(utc("2026-03-27T08:00:00Z"), "Europe/Paris", on(2026, 3, 30)))
    ).toStrictEqual(Option.some("2026-03-30T07:00:00.000Z"));
  });
});

describe(parseTime, () => {
  it.each([
    { expected: Option.some({ hour: 9, minute: 5 }), value: "09:05" },
    { expected: Option.some({ hour: 23, minute: 59 }), value: "23:59" },
    { expected: Option.none(), value: "24:00" },
    { expected: Option.none(), value: "" },
  ])("reads $value", ({ expected, value }) => {
    expect(parseTime(value)).toStrictEqual(expected);
  });

  it("writes what it reads", () => {
    expect(timeKey({ hour: 7, minute: 0 })).toBe("07:00");
  });
});

describe(parseDate, () => {
  const read = Schema.decodeUnknownOption(DateKeySchema);

  it.each([
    { expected: Option.some(on(2026, 6, 16)), value: "2026-06-16" },
    { expected: Option.none(), value: "2026-02-30" },
    { expected: Option.none(), value: "16/06/2026" },
    { expected: Option.none(), value: ["2026-06-16"] },
    { expected: Option.none(), value: undefined },
  ])("reads $value", ({ expected, value }) => {
    expect(read(value).pipe(Option.flatMap(parseDate))).toStrictEqual(expected);
  });
});
