import { DateTime, Option, Schema } from "effect";

// Wall-clock dates and times in IANA zones, as the composer and the calendar
// show them, and the instants they name. The policy for daylight saving is the
// server's (acme-server src/shared/domain/wall-clock.ts): a time the clocks
// skip moves to the moment they jump, and a time they repeat takes the
// earlier offset.

/** A calendar date, in no particular zone. */
export interface CalendarDate {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

/** A time of day, to the minute. */
export interface TimeOfDay {
  readonly hour: number;
  readonly minute: number;
}

/** What a clock on the wall of a zone shows at an instant. */
export interface WallClock {
  readonly date: CalendarDate;
  readonly time: TimeOfDay;
}

const pad = (value: number, length = 2) =>
  value.toString().padStart(length, "0");

/** A date as `YYYY-MM-DD`, which sorts as dates do. */
export const dateKey = ({ day, month, year }: CalendarDate): string =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

/** A time as `HH:mm`, as `<input type="time">` takes it. */
export const timeKey = ({ hour, minute }: TimeOfDay): string =>
  `${pad(hour)}:${pad(minute)}`;

/** A date written `YYYY-MM-DD`, as in a URL. */
export const DateKeySchema = Schema.String.check(
  Schema.isPattern(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u)
);

export type DateKey = typeof DateKeySchema.Type;

/** The date a key names, if it is one on the calendar. */
export const parseDate = (key: DateKey): Option.Option<CalendarDate> =>
  Option.some(key).pipe(
    Option.map((written): CalendarDate => {
      const [year = 0, month = 0, day = 0] = written.split("-").map(Number);

      return { day, month, year };
    }),
    Option.filter((date) =>
      Option.exists(
        DateTime.make(date),
        (midnight) => DateTime.getPartUtc(midnight, "day") === date.day
      )
    )
  );

const timeInput = /^(?<hour>[01]\d|2[0-3]):(?<minute>[0-5]\d)$/u;

/** The time an `<input type="time">` holds, if it holds one. */
export const parseTime = (value: string): Option.Option<TimeOfDay> =>
  Option.fromNullishOr(timeInput.exec(value)?.groups).pipe(
    Option.map(({ hour = "0", minute = "0" }) => ({
      hour: Number(hour),
      minute: Number(minute),
    }))
  );

/** The zone an IANA id names, if it names one. */
export const zoneOf = (timeZone: string) => DateTime.zoneMakeNamed(timeZone);

/** The zone the browser runs in. */
export const browserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * The zones a user may pick from, the given ones first when the engine's
 * list lacks them (it names each zone once, so an alias may be missing).
 */
export const timeZoneChoices = (...first: readonly string[]): string[] => {
  const known = Intl.supportedValuesOf("timeZone");

  return [
    ...new Set([...first.filter((zone) => !known.includes(zone)), ...known]),
  ];
};

const wallClockIn = (zoned: DateTime.DateTime): WallClock => {
  const { day, hour, minute, month, year } = DateTime.toParts(zoned);

  return { date: { day, month, year }, time: { hour, minute } };
};

/** What the clock of a zone shows at an instant, if the zone exists. */
export const wallClockOf = (
  instant: DateTime.DateTime,
  timeZone: string
): Option.Option<WallClock> =>
  zoneOf(timeZone).pipe(
    Option.map((zone) => wallClockIn(DateTime.setZone(instant, zone)))
  );

const showsWallClock = (zoned: DateTime.Zoned, wall: WallClock): boolean => {
  const shown = wallClockIn(zoned);

  return (
    dateKey(shown.date) === dateKey(wall.date) &&
    timeKey(shown.time) === timeKey(wall.time)
  );
};

// The first instant on the new offset, between an instant before a
// transition and one after it.
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
 * The instant a wall-clock date and time name in a zone, following the
 * daylight-saving policy above. None for a zone that does not exist or a
 * date that is not on the calendar.
 */
export const instantOf = (
  wall: WallClock,
  timeZone: string
): Option.Option<DateTime.Utc> =>
  Option.all({
    utcWall: DateTime.make({ ...wall.date, ...wall.time }),
    zone: zoneOf(timeZone),
  }).pipe(
    Option.filter(
      ({ utcWall }) => DateTime.getPartUtc(utcWall, "day") === wall.date.day
    ),
    Option.map(({ utcWall, zone }) => {
      const earlier = DateTime.setZone(utcWall, zone, {
        adjustForTimeZone: true,
        disambiguation: "earlier",
      });

      if (showsWallClock(earlier, wall)) {
        return DateTime.toUtc(earlier);
      }

      const later = DateTime.setZone(utcWall, zone, {
        adjustForTimeZone: true,
        disambiguation: "later",
      });

      return DateTime.toUtc(transitionBetween(earlier, later));
    })
  );

// Calendar arithmetic runs on midnight UTC, where no zone rule applies.
const midnightUtc = (date: CalendarDate) => DateTime.makeUnsafe(date);

/** The date `days` days after `date`; negative counts go back. */
export const addDays = (date: CalendarDate, days: number): CalendarDate => {
  const { day, month, year } = DateTime.toParts(
    DateTime.add(midnightUtc(date), { days })
  );

  return { day, month, year };
};

/** The day of the week, from 1 (Monday) to 7 (Sunday). */
export const weekdayOf = (date: CalendarDate): number => {
  const sundayFirst = DateTime.getPartUtc(midnightUtc(date), "weekDay");

  return sundayFirst === 0 ? 7 : sundayFirst;
};

/**
 * The first day of the week where the locale's people live, from 1
 * (Monday) to 7 (Sunday): Sunday for English, Monday for French.
 */
export const firstDayOfWeek = (locale: string): number =>
  locale.startsWith("en") ? 7 : 1;

/** The seven days of the week `date` is in. */
export const weekOf = (
  date: CalendarDate,
  firstDay: number
): readonly CalendarDate[] => {
  const start = addDays(date, -((weekdayOf(date) - firstDay + 7) % 7));

  return Array.from({ length: 7 }, (_, offset) => addDays(start, offset));
};

/**
 * The days a month view shows for the month of `date`: whole weeks, from the
 * week the month starts in to the week it ends in.
 */
export const monthOf = (
  date: CalendarDate,
  firstDay: number
): readonly CalendarDate[] => {
  const first = { ...date, day: 1 };
  const start = weekOf(first, firstDay)[0] ?? first;
  const next = addDays({ ...first, day: 28 }, 4);
  const last = addDays({ ...next, day: 1 }, -1);
  const end = weekOf(last, firstDay)[6] ?? last;

  const days = Math.round(
    (DateTime.toEpochMillis(midnightUtc(end)) -
      DateTime.toEpochMillis(midnightUtc(start))) /
      86_400_000
  );

  return Array.from({ length: days + 1 }, (_, offset) =>
    addDays(start, offset)
  );
};

/** The month before or after, on the first day. */
export const addMonths = (date: CalendarDate, months: number): CalendarDate => {
  const index = date.year * 12 + (date.month - 1) + months;

  return { day: 1, month: (index % 12) + 1, year: Math.floor(index / 12) };
};

const midnight: TimeOfDay = { hour: 0, minute: 0 };

/**
 * The instants from the start of the first day to the start of the day after
 * the last, in the zone: what a calendar lists for those days.
 */
export const rangeOf = (
  days: readonly CalendarDate[],
  timeZone: string
): Option.Option<{
  readonly from: DateTime.Utc;
  readonly to: DateTime.Utc;
}> => {
  const [first] = days;
  const last = days.at(-1);

  return first === undefined || last === undefined
    ? Option.none()
    : Option.all({
        from: instantOf({ date: first, time: midnight }, timeZone),
        to: instantOf({ date: addDays(last, 1), time: midnight }, timeZone),
      });
};

/**
 * Where a post dropped on the calendar goes: on `date`, at `hour` when the
 * drop names one (the week view), keeping its minutes, or at the time of day
 * it had (the month view), on the clock of the zone the viewer sees.
 */
export const movedTo = (
  instant: DateTime.DateTime,
  timeZone: string,
  date: CalendarDate,
  hour?: number
): Option.Option<DateTime.Utc> =>
  wallClockOf(instant, timeZone).pipe(
    Option.flatMap(({ time }) =>
      instantOf(
        { date, time: hour === undefined ? time : { ...time, hour } },
        timeZone
      )
    )
  );
