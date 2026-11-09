import { describe, expect, it } from "@effect/vitest";
import { DateTime, Result, Schema } from "effect";

import { isDue, Schedule, scheduleAt } from "#publishing/domain/schedule.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const ScheduleJson = Schema.toCodecJson(Schedule);

describe(scheduleAt, () => {
  it("stores the UTC instant and the zone it was scheduled in", () => {
    const schedule = scheduleAt(
      { day: 15, month: 6, year: 2026 },
      { hour: 9, minute: 30 },
      paris
    );

    expect(DateTime.formatIso(schedule.at)).toBe("2026-06-15T07:30:00.000Z");
    expect(schedule.timeZone).toBe("Europe/Paris");
    expect(DateTime.formatIsoZoned(schedule.local)).toBe(
      "2026-06-15T09:30:00.000+02:00[Europe/Paris]"
    );
  });

  it("follows the daylight-saving policy for a time that does not exist", () => {
    const schedule = scheduleAt(
      { day: 29, month: 3, year: 2026 },
      { hour: 2, minute: 30 },
      paris
    );

    expect(DateTime.formatIsoZoned(schedule.local)).toBe(
      "2026-03-29T03:00:00.000+02:00[Europe/Paris]"
    );
  });
});

describe(Schedule, () => {
  it("round-trips through JSON as an ISO instant and a zone id", () => {
    const json = { at: "2026-10-25T00:30:00.000Z", timeZone: "Europe/Paris" };
    const schedule = Schema.decodeUnknownSync(ScheduleJson)(json);

    expect(DateTime.formatIsoZoned(schedule.local)).toBe(
      "2026-10-25T02:30:00.000+02:00[Europe/Paris]"
    );
    expect(Schema.encodeSync(ScheduleJson)(schedule)).toStrictEqual(json);
  });

  it.each([
    { at: "2026-10-25T00:30:00.000Z", label: "an offset", timeZone: "+02:00" },
    {
      at: "2026-10-25T00:30:00.000Z",
      label: "an unknown zone",
      timeZone: "Europe/Atlantis",
    },
    { at: "not a date", label: "an invalid instant", timeZone: "Europe/Paris" },
  ])("refuses $label", (json) => {
    expect(
      Result.isFailure(Schema.decodeUnknownResult(ScheduleJson)(json))
    ).toBeTruthy();
  });
});

describe(isDue, () => {
  const schedule = new Schedule({
    at: DateTime.makeUnsafe("2026-06-15T07:30:00Z"),
    timeZone: paris,
  });

  it.each([
    { due: false, now: "2026-06-15T07:29:59.999Z" },
    { due: true, now: "2026-06-15T07:30:00.000Z" },
    { due: true, now: "2026-06-15T08:00:00.000Z" },
  ])("is $due at $now", ({ due, now }) => {
    expect(isDue(schedule, DateTime.makeUnsafe(now))).toBe(due);
  });
});
