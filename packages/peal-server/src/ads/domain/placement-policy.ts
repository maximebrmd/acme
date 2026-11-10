import { Duration, Option } from "effect";

/**
 * How long a boost's placement waits before each new attempt, when the
 * network refused for now or could not say what it holds: about two hours
 * in all. Past the last one the boost fails, with nothing running.
 * Attempts are few and far apart on purpose: networks hold an ad account
 * that is written to in bursts.
 */
export const placementDelays: readonly Duration.Duration[] = [
  Duration.minutes(1),
  Duration.minutes(5),
  Duration.minutes(15),
  Duration.minutes(30),
  Duration.minutes(60),
];

/** The wait after attempt `number` (from 1), none once attempts are spent. */
export const placementDelayAfter = (
  number: number
): Option.Option<Duration.Duration> =>
  Option.fromUndefinedOr(placementDelays[number - 1]);
