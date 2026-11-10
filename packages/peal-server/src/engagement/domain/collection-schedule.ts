import { DateTime, Duration, Option } from "effect";

// How often a post's comments are read: most arrive in its first day, so
// every run then, every hour for a week, and every six hours until the
// post leaves the window. The collection runs every ten minutes; each read
// schedules the next from the run it happened in, so a thread comes due on
// a run, never between.

/** How long after it went live a post's comments are read on every run. */
export const everyRunFor = Duration.hours(24);

/** How long after it went live a post's comments are read every hour. */
export const hourlyFor = Duration.days(7);

/** The time between two runs of the collection. */
export const runEvery = Duration.minutes(10);

/**
 * How long after it went live a post's comments are read, unless the
 * operator says otherwise (`PEAL_ENGAGEMENT_WINDOW_DAYS`).
 */
export const defaultWindow = Duration.days(30);

/** The longest window an operator may set. */
export const longestWindow = Duration.days(90);

/**
 * How long a thread whose platform did not answer, or asked to slow down,
 * waits before its next read: it leaves the front of the queue, so it never
 * holds back the channels that answer.
 */
export const retryAfter = Duration.minutes(30);

const hourly = Duration.hours(1);

const sixHourly = Duration.hours(6);

// How long a post of this age waits between two reads.
const stepAt = (age: Duration.Duration): Duration.Duration => {
  if (Duration.isLessThan(age, everyRunFor)) {
    return runEvery;
  }

  return Duration.isLessThan(age, hourlyFor) ? hourly : sixHourly;
};

/** The instant after which a post's comments are no longer read. */
export const collectionEnd = (
  publishedAt: DateTime.Utc,
  window: Duration.Duration
): DateTime.Utc => DateTime.addDuration(publishedAt, window);

/**
 * When to read a post's comments next, after the run `at` read them: ten
 * minutes later in its first day, an hour later in its first week, six
 * hours later after that, and a last time when it leaves the window. None
 * after that last time.
 */
export const nextCollection = (
  publishedAt: DateTime.Utc,
  at: DateTime.Utc,
  window: Duration.Duration
): Option.Option<DateTime.Utc> => {
  const end = collectionEnd(publishedAt, window);

  if (DateTime.isGreaterThanOrEqualTo(at, end)) {
    return Option.none();
  }

  const age = DateTime.distance(publishedAt, at);

  return Option.some(DateTime.min(DateTime.addDuration(at, stepAt(age)), end));
};
