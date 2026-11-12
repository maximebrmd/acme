import { DateTime, Option, Schema } from "effect";

import { timeZoneOf } from "./time-zone.ts";
import type { TimeZoneId } from "./time-zone.ts";

// Wall-clock time: a date and a time of day as people read them in a time
// zone, before any daylight-saving rule turns them into an instant.
//
// Daylight-saving policy, applied by `fromWallClock`:
//
// - A time in a spring-forward gap does not exist. It moves forward to the
//   first valid instant, the moment the clocks jump: 02:30 on 29 March 2026 in
//   Paris becomes 03:00 CEST (01:00 UTC). This is not the "compatible" rule
//   of the JavaScript Temporal API, Effect's default, which would shift it by
//   the gap's length to 03:30.
// - A time in a fall-back overlap happens twice. It takes the earlier offset,
//   the first time the clock shows it: 02:30 on 25 October 2026 in Paris is
//   02:30 CEST (00:30 UTC), so a daily post goes out once that day.

const between = (minimum: number, maximum: number) =>
  Schema.Int.check(Schema.isBetween({ maximum, minimum }));

interface CalendarParts {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

// The day must exist in that month: 30 February rolls over to March.
const isCalendarDate = (date: CalendarParts): boolean =>
  Option.exists(
    DateTime.make(date),
    (midnight) => DateTime.getPartUtc(midnight, "day") === date.day
  );

/** A calendar date, such as 29 March 2026, in no particular zone. */
export const LocalDateSchema = Schema.Struct({
  day: between(1, 31),
  month: between(1, 12),
  year: between(1970, 9999),
}).check(Schema.makeFilter(isCalendarDate, { expected: "a calendar date" }));

export type LocalDate = typeof LocalDateSchema.Type;

/** A time of day to the minute, such as 09:30. */
export const LocalTimeSchema = Schema.Struct({
  hour: between(0, 23),
  minute: between(0, 59),
});

export type LocalTime = typeof LocalTimeSchema.Type;

export const WeekdaySchema = Schema.Literals([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

export type Weekday = typeof WeekdaySchema.Type;

// DateTime numbers weekdays from Sunday, 0, to Saturday, 6.
const weekdayNumbers: Readonly<Record<Weekday, number>> = {
  friday: 5,
  monday: 1,
  saturday: 6,
  sunday: 0,
  thursday: 4,
  tuesday: 2,
  wednesday: 3,
};

// Calendar arithmetic runs on midnight UTC, where no zone rule applies.
const midnightUtc = (date: LocalDate): DateTime.Utc =>
  DateTime.makeUnsafe(date);

const dateOf = (dateTime: DateTime.DateTime): LocalDate => {
  const { day, month, year } = DateTime.toParts(dateTime);

  return { day, month, year };
};

/** The date `days` days after `date`; negative counts go back. */
const pad = (value: number, length = 2) =>
  value.toString().padStart(length, "0");

/** A date as ISO 8601 writes it: YYYY-MM-DD. */
export const isoDateOf = ({ day, month, year }: LocalDate): string =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

export const addDays = (date: LocalDate, days: number): LocalDate =>
  dateOf(DateTime.add(midnightUtc(date), { days }));

export const isWeekday = (date: LocalDate, weekday: Weekday): boolean =>
  DateTime.getPartUtc(midnightUtc(date), "weekDay") === weekdayNumbers[weekday];

/** The date an instant falls on in a time zone. */
export const localDateOf = (
  instant: DateTime.DateTime,
  timeZone: TimeZoneId
): LocalDate => dateOf(DateTime.setZone(instant, timeZoneOf(timeZone)));

const showsWallClock = (
  zoned: DateTime.Zoned,
  date: LocalDate,
  time: LocalTime
): boolean => {
  const parts = DateTime.toParts(zoned);

  return (
    parts.year === date.year &&
    parts.month === date.month &&
    parts.day === date.day &&
    parts.hour === time.hour &&
    parts.minute === time.minute
  );
};

// The first instant on the new offset, found by bisecting the milliseconds
// between an instant before a transition and one after it. Transitions do not
// always fall on the hour (some zones shift by 30 minutes), so the search
// assumes nothing about where the gap starts.
const transitionBetween = (
  before: DateTime.Zoned,
  after: DateTime.Zoned
): DateTime.Zoned => {
  const offsetAfter = DateTime.zonedOffset(after);
  let low = DateTime.toEpochMillis(before);
  let high = DateTime.toEpochMillis(after);

  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    const probe = DateTime.mapEpochMillis(after, () => middle);

    if (DateTime.zonedOffset(probe) === offsetAfter) {
      high = middle;
    } else {
      low = middle;
    }
  }

  return DateTime.mapEpochMillis(after, () => high);
};

/**
 * The instant a wall-clock date and time names in a time zone, following the
 * daylight-saving policy above.
 */
export const fromWallClock = (
  date: LocalDate,
  time: LocalTime,
  timeZone: TimeZoneId
): DateTime.Zoned => {
  const zone = timeZoneOf(timeZone);
  const wallClock = DateTime.makeUnsafe({ ...date, ...time });

  // "earlier" takes the first of two repeated times, which is the policy for
  // an overlap. In a gap it lands before the jump, on another wall clock.
  const earlier = DateTime.setZone(wallClock, zone, {
    adjustForTimeZone: true,
    disambiguation: "earlier",
  });

  if (showsWallClock(earlier, date, time)) {
    return earlier;
  }

  // In a gap, "later" lands after the jump, so the transition lies between.
  const later = DateTime.setZone(wallClock, zone, {
    adjustForTimeZone: true,
    disambiguation: "later",
  });

  return transitionBetween(earlier, later);
};
