import { DateTime, Duration } from "effect";

// Comments are written by people who are not Peal's users: Peal keeps them
// to show and answer them, and no longer than that takes.

/**
 * How long a thread, its comments and the replies sent from Peal are kept
 * once Peal stopped reading the post's comments: time to answer the last
 * ones. With the default window, 60 days after the post went live.
 */
export const keptAfterCollection = Duration.days(30);

/** Whether a thread whose collection ended at `endedAt` is deleted at `now`. */
export const isExpired = (endedAt: DateTime.Utc, now: DateTime.Utc): boolean =>
  DateTime.isGreaterThanOrEqualTo(
    now,
    DateTime.addDuration(endedAt, keptAfterCollection)
  );

/** The instant before which a collection must have ended to be purged at `now`. */
export const purgedBefore = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtractDuration(now, keptAfterCollection);
