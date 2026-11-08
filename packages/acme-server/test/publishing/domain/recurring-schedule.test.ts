import { describe, expect, it } from "@effect/vitest";
import { DateTime, Result, Schema } from "effect";

import {
  nextOccurrence,
  nextOccurrences,
  RecurringSchedule,
} from "#publishing/domain/recurring-schedule.ts";
import type { Recurrence } from "#publishing/domain/recurring-schedule.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";

const paris = TimeZoneIdSchema.make("Europe/Paris");
const newYork = TimeZoneIdSchema.make("America/New_York");

const recurring = (recurrence: Recurrence, timeZone: TimeZoneId) =>
  new RecurringSchedule({ recurrence, timeZone });

const localTimes = (
  schedule: RecurringSchedule,
  after: string,
  count: number
): readonly string[] =>
  nextOccurrences(schedule, DateTime.makeUnsafe(after), count).map(
    (occurrence) => DateTime.formatIsoZoned(occurrence.local)
  );

describe(nextOccurrences, () => {
  it("keeps a daily Paris time across the 2026 spring change", () => {
    const daily = recurring(
      { _tag: "daily", time: { hour: 9, minute: 0 } },
      paris
    );

    expect(
      nextOccurrences(
        daily,
        DateTime.makeUnsafe("2026-03-27T12:00:00Z"),
        3
      ).map((occurrence) => DateTime.formatIso(occurrence.at))
    ).toStrictEqual([
      "2026-03-28T08:00:00.000Z",
      "2026-03-29T07:00:00.000Z",
      "2026-03-30T07:00:00.000Z",
    ]);
  });

  it("moves a daily time inside the 2026 Paris gap to 03:00 that day only", () => {
    const daily = recurring(
      { _tag: "daily", time: { hour: 2, minute: 30 } },
      paris
    );

    expect(localTimes(daily, "2026-03-27T12:00:00Z", 3)).toStrictEqual([
      "2026-03-28T02:30:00.000+01:00[Europe/Paris]",
      "2026-03-29T03:00:00.000+02:00[Europe/Paris]",
      "2026-03-30T02:30:00.000+02:00[Europe/Paris]",
    ]);
  });

  it("posts a daily time once on the 2026 Paris fall-back day", () => {
    const daily = recurring(
      { _tag: "daily", time: { hour: 2, minute: 30 } },
      paris
    );

    expect(localTimes(daily, "2026-10-23T12:00:00Z", 3)).toStrictEqual([
      "2026-10-24T02:30:00.000+02:00[Europe/Paris]",
      "2026-10-25T02:30:00.000+02:00[Europe/Paris]",
      "2026-10-26T02:30:00.000+01:00[Europe/Paris]",
    ]);
  });

  it("posts a daily time once on the 2026 New York fall-back day", () => {
    const daily = recurring(
      { _tag: "daily", time: { hour: 1, minute: 30 } },
      newYork
    );

    expect(localTimes(daily, "2026-10-30T12:00:00Z", 3)).toStrictEqual([
      "2026-10-31T01:30:00.000-04:00[America/New_York]",
      "2026-11-01T01:30:00.000-04:00[America/New_York]",
      "2026-11-02T01:30:00.000-05:00[America/New_York]",
    ]);
  });

  it("keeps weekdays and their local time across the 2027 New York spring change", () => {
    const weekly = recurring(
      {
        _tag: "weekly",
        days: ["monday", "wednesday", "friday"],
        time: { hour: 8, minute: 0 },
      },
      newYork
    );

    // Wednesday 10 March 2027, 09:00 EST: that day's 08:00 has passed.
    expect(localTimes(weekly, "2027-03-10T14:00:00Z", 3)).toStrictEqual([
      "2027-03-12T08:00:00.000-05:00[America/New_York]",
      "2027-03-15T08:00:00.000-04:00[America/New_York]",
      "2027-03-17T08:00:00.000-04:00[America/New_York]",
    ]);
  });

  it("moves a weekly time inside the 2026 New York gap to 03:00", () => {
    const weekly = recurring(
      { _tag: "weekly", days: ["sunday"], time: { hour: 2, minute: 30 } },
      newYork
    );

    expect(localTimes(weekly, "2026-03-02T00:00:00Z", 2)).toStrictEqual([
      "2026-03-08T03:00:00.000-04:00[America/New_York]",
      "2026-03-15T02:30:00.000-04:00[America/New_York]",
    ]);
  });

  it("keeps a weekly Paris time across the 2027 fall-back day", () => {
    const weekly = recurring(
      { _tag: "weekly", days: ["sunday"], time: { hour: 2, minute: 30 } },
      paris
    );

    expect(localTimes(weekly, "2027-10-25T00:00:00Z", 2)).toStrictEqual([
      "2027-10-31T02:30:00.000+02:00[Europe/Paris]",
      "2027-11-07T02:30:00.000+01:00[Europe/Paris]",
    ]);
  });
});

describe(nextOccurrence, () => {
  const weekly = recurring(
    { _tag: "weekly", days: ["monday"], time: { hour: 8, minute: 0 } },
    paris
  );

  it("returns a later time the same day", () => {
    // Monday 15 June 2026, 07:00 in Paris.
    const occurrence = nextOccurrence(
      weekly,
      DateTime.makeUnsafe("2026-06-15T05:00:00Z")
    );

    expect(DateTime.formatIsoZoned(occurrence.local)).toBe(
      "2026-06-15T08:00:00.000+02:00[Europe/Paris]"
    );
    expect(occurrence.timeZone).toBe("Europe/Paris");
  });

  it("returns the occurrence strictly after the given instant", () => {
    const occurrence = nextOccurrence(
      weekly,
      DateTime.makeUnsafe("2026-06-15T06:00:00Z")
    );

    expect(DateTime.formatIsoZoned(occurrence.local)).toBe(
      "2026-06-22T08:00:00.000+02:00[Europe/Paris]"
    );
  });

  // West of UTC in the evening, the UTC date is already the next day: the
  // search starts from the zone's own date, so that evening's post is kept.
  const eveningPosts: readonly {
    readonly label: string;
    readonly recurrence: Recurrence;
  }[] = [
    {
      label: "daily",
      recurrence: { _tag: "daily", time: { hour: 22, minute: 0 } },
    },
    {
      label: "Monday",
      recurrence: {
        _tag: "weekly",
        days: ["monday"],
        time: { hour: 22, minute: 0 },
      },
    },
  ];

  it.each(eveningPosts)(
    "keeps a $label 22:00 New York post asked for at 21:00 local",
    ({ recurrence }) => {
      // Monday 15 June 2026, 21:00 EDT: Tuesday 16 June in UTC.
      const occurrence = nextOccurrence(
        recurring(recurrence, newYork),
        DateTime.makeUnsafe("2026-06-16T01:00:00Z")
      );

      expect(DateTime.formatIsoZoned(occurrence.local)).toBe(
        "2026-06-15T22:00:00.000-04:00[America/New_York]"
      );
    }
  );
});

describe(RecurringSchedule, () => {
  const decode = Schema.decodeUnknownResult(
    Schema.toCodecJson(RecurringSchedule)
  );

  it("decodes a weekly recurrence", () => {
    const result = decode({
      recurrence: {
        _tag: "weekly",
        days: ["tuesday", "thursday"],
        time: { hour: 18, minute: 45 },
      },
      timeZone: "America/New_York",
    });

    expect(Result.isSuccess(result)).toBeTruthy();
  });

  it.each([
    {
      label: "a week with no days",
      recurrence: { _tag: "weekly", days: [], time: { hour: 9, minute: 0 } },
    },
    {
      label: "a day listed twice",
      recurrence: {
        _tag: "weekly",
        days: ["monday", "monday"],
        time: { hour: 9, minute: 0 },
      },
    },
    {
      label: "an hour past 23",
      recurrence: { _tag: "daily", time: { hour: 24, minute: 0 } },
    },
  ])("refuses $label", ({ recurrence }) => {
    expect(
      Result.isFailure(decode({ recurrence, timeZone: "Europe/Paris" }))
    ).toBeTruthy();
  });
});
