import { DateTime, Duration, Result, Schema } from "effect";

import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  addDays,
  fromWallClock,
  LocalDateSchema,
} from "#shared/domain/wall-clock.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

import { InvalidReportRange } from "./invalid-report-range.ts";

/** The longest range a report covers: a year, leap day included. */
export const maxReportDays = 366;

/**
 * The days a report covers, from `from` to `to` included, as the calendar
 * of `timeZone` has them: a day starts and ends at midnight there, so a
 * day the clocks change lasts 23 or 25 hours.
 */
export class ReportRange extends Schema.Class<ReportRange>(
  "peal-server/analytics/domain/ReportRange"
)({
  from: LocalDateSchema,
  timeZone: TimeZoneIdSchema,
  to: LocalDateSchema,
}) {}

// Calendar arithmetic runs on midnight UTC, where no zone rule applies.
const midnightUtc = (date: LocalDate) => DateTime.makeUnsafe(date);

const daysBetween = (from: LocalDate, to: LocalDate): number =>
  Math.round(
    Duration.toMillis(DateTime.distance(midnightUtc(from), midnightUtc(to))) /
      Duration.toMillis(Duration.days(1))
  );

const isLocalDate = Schema.is(LocalDateSchema);

/**
 * The range, if it is one a report covers: it ends on or after the day it
 * starts, spans `maxReportDays` at most, and ends on a day followed by
 * another on the calendar Peal keeps, as its end is when that one starts.
 */
export const reportRange = (
  range: Pick<ReportRange, "from" | "timeZone" | "to">
): Result.Result<ReportRange, InvalidReportRange> => {
  const days = daysBetween(range.from, range.to) + 1;

  return days < 1 || days > maxReportDays || !isLocalDate(addDays(range.to, 1))
    ? Result.fail(new InvalidReportRange({ days }))
    : Result.succeed(new ReportRange(range));
};

/** Each day of the range, in order. */
export const reportDays = (range: ReportRange): readonly LocalDate[] =>
  Array.from({ length: daysBetween(range.from, range.to) + 1 }, (_, offset) =>
    addDays(range.from, offset)
  );

const midnight = { hour: 0, minute: 0 };

/**
 * The instant each day of the range starts, then the instant the last one
 * ends: one more than the days. A day is the time from its start to the
 * next.
 */
export const dayStarts = (range: ReportRange): readonly DateTime.Utc[] =>
  [...reportDays(range), addDays(range.to, 1)].map((date) =>
    DateTime.toUtc(fromWallClock(date, midnight, range.timeZone))
  );
