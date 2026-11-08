import { DateTime, Schema } from "effect";

import { TimeZoneIdSchema, timeZoneOf } from "#shared/domain/time-zone.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";
import { fromWallClock } from "#shared/domain/wall-clock.ts";
import type { LocalDate, LocalTime } from "#shared/domain/wall-clock.ts";

/**
 * When a post goes out: the instant, in UTC, and the IANA time zone it was
 * scheduled in. The zone lets calendars show the post on the wall clock the
 * user picked, and recurring posts keep their local time when daylight saving
 * shifts the offset.
 */
export class Schedule extends Schema.Class<Schedule>(
  "acme-server/publishing/domain/Schedule"
)({
  at: Schema.DateTimeUtc,
  timeZone: TimeZoneIdSchema,
}) {
  /** The scheduled instant on the wall clock of its zone. */
  get local(): DateTime.Zoned {
    return DateTime.setZone(this.at, timeZoneOf(this.timeZone));
  }
}

/**
 * Schedules a post at a wall-clock date and time in a zone. A time that
 * daylight saving skips or repeats follows the policy in
 * `#shared/domain/wall-clock.ts`.
 */
export const scheduleAt = (
  date: LocalDate,
  time: LocalTime,
  timeZone: TimeZoneId
): Schedule =>
  new Schedule({
    at: DateTime.toUtc(fromWallClock(date, time, timeZone)),
    timeZone,
  });

/** Whether the scheduled instant has come. */
export const isDue = (schedule: Schedule, now: DateTime.Utc): boolean =>
  DateTime.isGreaterThanOrEqualTo(now, schedule.at);
