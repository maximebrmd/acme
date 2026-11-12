import { DateTime, Schema } from "effect";

import { timeZoneOf } from "#shared/domain/time-zone.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";
import {
  addDays,
  fromWallClock,
  localDateOf,
} from "#shared/domain/wall-clock.ts";
import type { LocalDate, LocalTime } from "#shared/domain/wall-clock.ts";

// The limits below are the owner's to change: each is written once here,
// and the contract's copy is kept equal by a test.

/** The longest interval of each unit a rule repeats at. */
export const maxRecyclingInterval = {
  days: 365,
  months: 12,
  weeks: 52,
} as const;

/** What an interval counts in. */
export const RecyclingUnitSchema = Schema.Literals(["days", "weeks", "months"]);

export type RecyclingUnit = typeof RecyclingUnitSchema.Type;

/**
 * How long a rule waits from one occurrence to the next: 1 to 365 days, 1
 * to 52 weeks or 1 to 12 months.
 */
export const RecyclingIntervalSchema = Schema.Struct({
  count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  unit: RecyclingUnitSchema,
}).check(
  Schema.makeFilter(
    ({
      count,
      unit,
    }: {
      readonly count: number;
      readonly unit: RecyclingUnit;
    }) => count <= maxRecyclingInterval[unit],
    { expected: "at most 365 days, 52 weeks or 12 months" }
  )
);

export type RecyclingInterval = typeof RecyclingIntervalSchema.Type;

const daysIn = (year: number, month: number): number => {
  const next =
    month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };

  return addDays({ ...next, day: 1 }, -1).day;
};

// The date `months` months after `date`, on the same day, or the month's
// last when it is shorter: 31 January and a month is 28 February.
const addMonths = (date: LocalDate, months: number): LocalDate => {
  const total = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;

  return { day: Math.min(date.day, daysIn(year, month)), month, year };
};

const monthsBetween = (from: LocalDate, to: LocalDate): number =>
  (to.year - from.year) * 12 + (to.month - from.month);

const dayLength = 86_400_000;

// The wall-clock time an instant shows in a zone, to the minute.
const timeOf = (instant: DateTime.Utc, timeZone: TimeZoneId): LocalTime => {
  const { hour, minute } = DateTime.toParts(
    DateTime.setZone(instant, timeZoneOf(timeZone))
  );

  return { hour, minute };
};

/**
 * The instant of a rule's `step`-th interval after `anchor`, the time its
 * first post had: the same wall-clock time in `timeZone`, `step` intervals
 * of days, weeks or months later, a month shorter than the anchor's day
 * taking its last day. Counted from the anchor, never from the step
 * before, so 31 January monthly is 28 February, then 31 March. A time
 * daylight saving skips moves to the moment the clocks jump
 * (`fromWallClock`).
 */
export const dueAt = (
  interval: RecyclingInterval,
  anchor: DateTime.Utc,
  timeZone: TimeZoneId,
  step: number
): DateTime.Utc => {
  const date = localDateOf(anchor, timeZone);
  const span = interval.count * step;

  const day =
    interval.unit === "months"
      ? addMonths(date, span)
      : addDays(date, interval.unit === "weeks" ? span * 7 : span);

  return DateTime.toUtc(fromWallClock(day, timeOf(anchor, timeZone), timeZone));
};

/**
 * The first of a rule's due instants strictly after `after`, one interval
 * after the anchor at the earliest: what an occurrence is due at once the
 * one before it, or a time missed while nothing ran, has passed. Missed
 * intervals are skipped, never made up for.
 */
export const nextDueAfter = (
  interval: RecyclingInterval,
  anchor: DateTime.Utc,
  timeZone: TimeZoneId,
  after: DateTime.Utc
): DateTime.Utc => {
  // A step a little before the answer, so the walk below is short: daylight
  // saving moves an instant by hours, never by a whole interval.
  const elapsed =
    interval.unit === "months"
      ? monthsBetween(
          localDateOf(anchor, timeZone),
          localDateOf(after, timeZone)
        ) / interval.count
      : (DateTime.toEpochMillis(after) - DateTime.toEpochMillis(anchor)) /
        (dayLength * interval.count * (interval.unit === "weeks" ? 7 : 1));

  let step = Math.max(1, Math.floor(elapsed) - 1);

  for (;;) {
    const at = dueAt(interval, anchor, timeZone, step);

    if (DateTime.isGreaterThan(at, after)) {
      return at;
    }

    step += 1;
  }
};
