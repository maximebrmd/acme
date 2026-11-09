import { DateTime, Duration, Option } from "effect";

// How often a post's counts are read: every hour while it is young, when
// they move most, then every day, until a last read 30 days after it went
// live. The collection runs every hour; each read schedules the next one
// from the run it happened in, so a post comes due on a run, never between.

/** How long after it went live a post is read every hour. */
export const hourlyFor = Duration.hours(48);

/** How long after it went live a post is read at all. */
export const collectedFor = Duration.days(30);

const hourly = Duration.hours(1);

const daily = Duration.days(1);

/**
 * When a post is read first: as soon as it went live, so on the first run
 * after, which also gives the counts it started from.
 */
export const firstCollection = (publishedAt: DateTime.Utc): DateTime.Utc =>
  publishedAt;

/** The instant after which a post is no longer read. */
export const collectionEnd = (publishedAt: DateTime.Utc): DateTime.Utc =>
  DateTime.addDuration(publishedAt, collectedFor);

/**
 * When to read a post next, after the run `at` read it or passed it over:
 * an hour later while it is younger than 48 hours, a day later after that,
 * and a last time once it is 30 days old. None after that last time.
 */
export const nextCollection = (
  publishedAt: DateTime.Utc,
  at: DateTime.Utc
): Option.Option<DateTime.Utc> => {
  const end = collectionEnd(publishedAt);

  if (DateTime.isGreaterThanOrEqualTo(at, end)) {
    return Option.none();
  }

  const age = DateTime.distance(publishedAt, at);
  const step = Duration.isLessThan(age, hourlyFor) ? hourly : daily;

  return Option.some(DateTime.min(DateTime.addDuration(at, step), end));
};
