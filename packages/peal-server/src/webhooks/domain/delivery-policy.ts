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

/**
 * How many test events and deliveries sent again a workspace's members
 * may start in an hour: each is up to eight requests from Peal's address
 * to a host they chose. Enough to set a receiver up, too few to aim Peal
 * at someone. The contract copies it.
 */
export const manualSendsPerHour = 30;

/** How long a delivery stays in its endpoint's log, with its event. */
export const deliveryRetention = Duration.days(30);

/**
 * How many channels an endpoint may listen to, and how many workspaces a
 * partner endpoint: enough for an embedding product's tenants, a filter a
 * person can still read. The contract copies them.
 */
export const maxFilterChannels = 50;
export const maxFilterWorkspaces = 200;

/**
 * How many headers of its own an endpoint's deliveries carry at most: one
 * for a gateway's token, and a few to route on. An owner's decision.
 */
export const maxEndpointHeaders = 5;

/**
 * How many deliveries a workspace's members may send again in an hour by
 * the many, apart from the test events and single sends of
 * `manualSendsPerHour`: enough to replay a day of failures after an
 * outage, and a call is taken whole or not at all. The contract copies it.
 */
export const bulkRedeliveriesPerHour = 1000;

/** How many deliveries one call sends again at most. */
export const maxBulkRedelivery = 100;

/**
 * How far apart the deliveries of one call to send many again start, per
 * endpoint, so a receiver that just came back is not sent them all at once.
 */
export const bulkReplaySpacing = Duration.millis(250);

/**
 * What members send by hand, each kind counted apart: test events and
 * deliveries sent again one by one, or deliveries sent again by the many.
 */
export type ManualSendKind = "bulk" | "single";

/** How many sends of the kind a workspace may start in an hour. */
export const manualSendAllowance = (kind: ManualSendKind): number =>
  kind === "bulk" ? bulkRedeliveriesPerHour : manualSendsPerHour;

/** The window manual sends are counted in. */
export const manualSendWindow = Duration.hours(1);

/** How long the counts of ended windows are kept. */
export const manualSendCountRetention = Duration.days(1);
