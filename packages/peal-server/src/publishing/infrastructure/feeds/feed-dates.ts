import { DateTime, Option } from "effect";

const months = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

// RFC 822's zones, by their offset from UT in minutes. Military letters
// are left out: RFC 1123 notes their signs were defined backwards, so
// they say nothing reliable.
const zones = new Map([
  ["ut", 0],
  ["gmt", 0],
  ["z", 0],
  ["est", -300],
  ["edt", -240],
  ["cst", -360],
  ["cdt", -300],
  ["mst", -420],
  ["mdt", -360],
  ["pst", -480],
  ["pdt", -420],
]);

// [day-of-week ","] day month year hour ":" minute [":" second] zone
const rfc822Pattern =
  /^(?:[a-z]{3},\s*)?(?<day>\d{1,2})\s+(?<month>[a-z]{3})[a-z]*\s+(?<year>\d{2}|\d{4})\s+(?<hour>\d{1,2}):(?<minute>\d{2})(?::(?<second>\d{2}))?\s*(?<zone>[+-]\d{4}|[a-z]+)?$/iu;

const offsetOf = (zone: string | undefined): Option.Option<number> => {
  if (zone === undefined) {
    return Option.some(0);
  }

  if (/^[+-]\d{4}$/u.test(zone)) {
    const sign = zone.startsWith("-") ? -1 : 1;
    const hours = Number(zone.slice(1, 3));
    const minutes = Number(zone.slice(3, 5));

    return minutes < 60
      ? Option.some(sign * (hours * 60 + minutes))
      : Option.none();
  }

  return Option.fromUndefinedOr(zones.get(zone.toLowerCase()));
};

// A two-digit year, as RFC 5322 reads obsolete ones: from 50, 19xx.
const twoDigitYear = (year: number) => (year < 50 ? 2000 + year : 1900 + year);

const groupOf = (groups: Record<string, string | undefined>, name: string) =>
  Number(groups[name] ?? "0");

/**
 * An RFC 822 date as RSS 2.0 writes one (`Sat, 07 Sep 2002 00:00:01
 * GMT`), with a two or four digit year (two digits read as 19xx from 50,
 * 20xx below, as RFC 5322 reads obsolete years), a zone by name or by
 * offset; none for anything else, a day that does not exist included.
 */
export const rfc822Date = (text: string): Option.Option<DateTime.Utc> => {
  const groups = rfc822Pattern.exec(text.trim())?.groups;

  if (groups === undefined) {
    return Option.none();
  }

  const month = months.indexOf(
    (groups["month"] ?? "").slice(0, 3).toLowerCase()
  );

  const short = groupOf(groups, "year");

  const year =
    (groups["year"] ?? "").length === 2 ? twoDigitYear(short) : short;

  const day = groupOf(groups, "day");
  const hour = groupOf(groups, "hour");
  const minute = groupOf(groups, "minute");
  const second = groupOf(groups, "second");

  return offsetOf(groups["zone"]).pipe(
    Option.filter(
      () => month !== -1 && hour < 24 && minute < 60 && second < 61 && day >= 1
    ),
    Option.flatMap((offset) => {
      const parts = {
        day,
        hour,
        minute,
        month: month + 1,
        second: Math.min(second, 59),
        year,
      };

      return DateTime.make(parts).pipe(
        // A day past its month's end rolls over: not a date.
        Option.filter((at) => DateTime.getPartUtc(at, "day") === day),
        Option.map((at) => DateTime.add(at, { minutes: -offset }))
      );
    })
  );
};

// RFC 3339's date-time: a date, a time, and an offset or Z.
const rfc3339Pattern =
  /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/u;

/**
 * An RFC 3339 date-time as Atom and JSON Feed write one, with its offset;
 * none for anything else.
 */
export const rfc3339Date = (text: string): Option.Option<DateTime.Utc> => {
  const trimmed = text.trim();

  return rfc3339Pattern.test(trimmed)
    ? DateTime.make(trimmed).pipe(Option.map(DateTime.toUtc))
    : Option.none();
};
