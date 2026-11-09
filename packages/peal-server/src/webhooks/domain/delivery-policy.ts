import { Duration, Option } from "effect";

// What the docs promise receivers. Change the page with them.

/** How many endpoints a workspace may have, whatever its plan. */
export const maxEndpointsPerWorkspace = 10;

/** How long a receiver has to answer before the attempt counts as failed. */
export const requestTimeout = Duration.seconds(15);

/**
 * How long to wait before each new attempt of a delivery that failed: about
 * a day in all, after which the delivery is failed for good.
 */
export const retryDelays: readonly Duration.Duration[] = [
  Duration.seconds(5),
  Duration.minutes(5),
  Duration.minutes(30),
  Duration.hours(2),
  Duration.hours(5),
  Duration.hours(8),
  Duration.hours(8),
];

/** The first attempt, and one after each delay. */
export const maxAttempts = retryDelays.length + 1;

/** How long to wait after the failed attempt `attempt`, if another follows. */
export const retryDelayAfter = (
  attempt: number
): Option.Option<Duration.Duration> =>
  Option.fromUndefinedOr(retryDelays[attempt - 1]);

/**
 * How long an endpoint may fail every attempt before it is turned off, and
 * the workspace told.
 */
export const turnOffAfterFailingFor = Duration.days(5);

/**
 * How long a rotated secret still signs beside the new one, so receivers
 * change theirs without missing a delivery.
 */
export const secretOverlap = Duration.hours(24);

/** How long a delivery stays in its endpoint's log, with its event. */
export const deliveryRetention = Duration.days(30);
