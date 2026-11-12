import { DateTime, Duration, Option } from "effect";

// Comments are written by people who are not Peal's users: Peal keeps them
// to show and answer them, and no longer than that takes.

/**
 * How long a thread, its comments and the replies sent from Peal are kept
 * once Peal stopped reading the post's comments: time to answer the last
 * ones. With the default window, 60 days after the post went live.
 */
export const keptAfterCollection = Duration.days(30);

/**
 * The latest instant a collection may have ended at for its thread to be
 * deleted at `now`.
 */
export const purgedBefore = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtractDuration(now, keptAfterCollection);

/**
 * When the comments a read found must be read again, or be forgotten:
 * the read's instant plus the bound its platform sets on keeping what it
 * gave without reading it again (`refreshWithin`, which travels with the
 * read, since a thread does not know its platform). None on a platform
 * that bounds nothing but the thread's own retention.
 */
export const refreshDeadline = (
  readAt: DateTime.Utc,
  refreshWithin: Option.Option<Duration.Duration>
): Option.Option<DateTime.Utc> =>
  refreshWithin.pipe(
    Option.map((bound) => DateTime.addDuration(readAt, bound))
  );

/** Whether a thread's comments must be forgotten at `now`. */
export const isPastRefresh = (
  refreshBy: Option.Option<DateTime.Utc>,
  now: DateTime.Utc
): boolean =>
  Option.exists(refreshBy, (by) => DateTime.isGreaterThanOrEqualTo(now, by));
