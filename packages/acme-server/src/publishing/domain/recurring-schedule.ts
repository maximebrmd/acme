import { DateTime, Schema } from "effect";

import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  addDays,
  fromWallClock,
  isWeekday,
  LocalTimeSchema,
  localDateOf,
  WeekdaySchema,
} from "#shared/domain/wall-clock.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

import { Schedule } from "./schedule.ts";

const DailySchema = Schema.TaggedStruct("daily", {
  time: LocalTimeSchema,
});

const WeeklySchema = Schema.TaggedStruct("weekly", {
  days: Schema.NonEmptyArray(WeekdaySchema).check(Schema.isUnique()),
  time: LocalTimeSchema,
});

/** Every day, or on some days of the week, at a wall-clock time. */
export const RecurrenceSchema = Schema.Union([DailySchema, WeeklySchema]);

export type Recurrence = typeof RecurrenceSchema.Type;

/**
 * A recurrence in the zone it was set up in. Occurrences keep their local
 * time: a post set for 09:00 in Paris goes out at 08:00 UTC in winter and
 * 07:00 UTC in summer.
 */
export class RecurringSchedule extends Schema.Class<RecurringSchedule>(
  "acme-server/publishing/domain/RecurringSchedule"
)({
  recurrence: RecurrenceSchema,
  timeZone: TimeZoneIdSchema,
}) {}

const occursOn = (recurrence: Recurrence, date: LocalDate): boolean =>
  recurrence._tag === "daily" ||
  recurrence.days.some((day) => isWeekday(date, day));

/**
 * The first occurrence strictly after `after`. A time that daylight saving
 * skips moves to the moment the clocks jump, and a repeated time happens once,
 * at its earlier offset (see `#shared/domain/wall-clock.ts`).
 */
export const nextOccurrence = (
  recurring: RecurringSchedule,
  after: DateTime.Utc
): Schedule => {
  const { recurrence, timeZone } = recurring;
  const firstDate = localDateOf(after, timeZone);

  // Days are checked from the local date of `after` on. A daily recurrence
  // matches within two days and a weekly one, whose days are never empty,
  // within eight, so the loop always returns.
  for (let offset = 0; ; offset += 1) {
    const date = addDays(firstDate, offset);

    if (occursOn(recurrence, date)) {
      const at = DateTime.toUtc(fromWallClock(date, recurrence.time, timeZone));

      if (DateTime.isGreaterThan(at, after)) {
        return new Schedule({ at, timeZone });
      }
    }
  }
};

/** The next `count` occurrences after `after`, in order. */
export const nextOccurrences = (
  recurring: RecurringSchedule,
  after: DateTime.Utc,
  count: number
): readonly Schedule[] => {
  const occurrences: Schedule[] = [];
  let cursor = after;

  while (occurrences.length < count) {
    const occurrence = nextOccurrence(recurring, cursor);

    occurrences.push(occurrence);
    cursor = occurrence.at;
  }

  return occurrences;
};
