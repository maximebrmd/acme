import { DateTime, Option, Schema } from "effect";

import {
  dateKey,
  instantOf,
  parseDate,
  parseTime,
  timeKey,
  wallClockOf,
} from "#posts/zoned-time.ts";
import type { CalendarDate, TimeOfDay } from "#posts/zoned-time.ts";

// Where a new post's schedule starts when the calendar opened the
// composer: `?at=YYYY-MM-DDTHH:mm`, a date and a time on the viewer's own
// clock.

/** A date and a time written `YYYY-MM-DDTHH:mm`, as in a URL. */
export const StartAtSchema = Schema.String.check(
  Schema.isPattern(
    /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d$/u
  )
);

const decodeStartAt = Schema.decodeUnknownOption(StartAtSchema);

/** What `at` says for a date and a time. */
export const startAtOf = (date: CalendarDate, time: TimeOfDay): string =>
  `${dateKey(date)}T${timeKey(time)}`;

/** A date, a time and the zone they are read in. */
export interface StartChoice {
  readonly date: CalendarDate;
  readonly time: string;
  readonly timeZone: string;
}

/**
 * The date and time `at` names on the clock of `timeZone`, if it names
 * one still to come. Anything else (no value, a malformed one, a day the
 * calendar lacks, a time that has passed) is none.
 */
export const startChoiceOf = (
  at: string | undefined,
  timeZone: string,
  now: DateTime.Utc
): Option.Option<StartChoice> =>
  decodeStartAt(at).pipe(
    Option.flatMap((written) => {
      const [day = "", clock = ""] = written.split("T");

      return Option.all({ date: parseDate(day), time: parseTime(clock) });
    }),
    Option.filter(({ date, time }) =>
      Option.exists(instantOf({ date, time }, timeZone), (instant) =>
        DateTime.isGreaterThan(instant, now)
      )
    ),
    Option.map(({ date, time }) => ({ date, time: timeKey(time), timeZone }))
  );

/** Whether a new post can still start at this date and time. */
export const isAhead = (
  date: CalendarDate,
  time: TimeOfDay,
  timeZone: string,
  now: DateTime.Utc
): boolean =>
  Option.exists(instantOf({ date, time }, timeZone), (instant) =>
    DateTime.isGreaterThan(instant, now)
  );

const morning: TimeOfDay = { hour: 9, minute: 0 };

/**
 * The time a new post started from a day of the calendar gets: nine in
 * the morning, or the next full hour on a day already past nine. None for
 * a day that is over.
 */
export const startTimeOn = (
  date: CalendarDate,
  timeZone: string,
  now: DateTime.Utc
): Option.Option<TimeOfDay> => {
  if (isAhead(date, morning, timeZone, now)) {
    return Option.some(morning);
  }

  return wallClockOf(DateTime.add(now, { hours: 1 }), timeZone).pipe(
    Option.filter((next) => dateKey(next.date) === dateKey(date)),
    Option.map(({ time }): TimeOfDay => ({ hour: time.hour, minute: 0 }))
  );
};
