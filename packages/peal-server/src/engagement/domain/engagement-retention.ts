import { DateTime, Duration } from "effect";

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
