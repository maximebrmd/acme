import { DateTime, Duration, Option, Schema } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";

// How often an account's numbers are read: once a day, on the hourly run
// it first came due on, so followers have one point a day from the day the
// channel was connected.

/** How long after a read an account is read again. */
export const accountReadEvery = Duration.days(1);

/** How long a read put off by its platform waits: until the next run. */
export const accountRetryAfter = Duration.hours(1);

/**
 * How long a channel Peal reads no account numbers on waits before it is
 * asked again: a later release, or a setting, may read it.
 */
export const unsupportedAccountRetry = Duration.days(7);

/**
 * A connected channel whose account analytics reads: when next, and when
 * it was read last.
 */
export class TrackedChannel extends Schema.Class<TrackedChannel>(
  "peal-server/analytics/domain/TrackedChannel"
)({
  channelId: ChannelIdSchema,
  lastCollectedAt: Schema.Option(Schema.DateTimeUtc),
  nextCollectionAt: Schema.DateTimeUtc,
  platform: PlatformSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

/** A channel as the channels context lists it. */
export type ConnectedChannel = Pick<
  TrackedChannel,
  "channelId" | "platform" | "workspaceId"
>;

/** A channel analytics starts following at `at`, read on that run. */
export const followChannel = (
  channel: ConnectedChannel,
  at: DateTime.Utc
): TrackedChannel =>
  new TrackedChannel({
    ...channel,
    lastCollectedAt: Option.none(),
    nextCollectionAt: at,
  });

const waiting = (
  channel: TrackedChannel,
  nextCollectionAt: DateTime.Utc,
  lastCollectedAt = channel.lastCollectedAt
) =>
  new TrackedChannel({
    channelId: channel.channelId,
    lastCollectedAt,
    nextCollectionAt,
    platform: channel.platform,
    workspaceId: channel.workspaceId,
  });

/** The channel once the run `at` read it, at `collectedAt`. */
export const accountRead = (
  channel: TrackedChannel,
  collectedAt: DateTime.Utc,
  at: DateTime.Utc
): TrackedChannel =>
  waiting(
    channel,
    DateTime.addDuration(at, accountReadEvery),
    Option.some(collectedAt)
  );

/**
 * The channel once the run `at` passed it over, as when it is turned off
 * or did not allow the read: it waits a day.
 */
export const accountSkipped = (
  channel: TrackedChannel,
  at: DateTime.Utc
): TrackedChannel =>
  waiting(channel, DateTime.addDuration(at, accountReadEvery));

/**
 * The channel once its platform put the run `at` off: it comes due again
 * at the next run, after the channels that were not put off.
 */
export const accountPutOff = (
  channel: TrackedChannel,
  at: DateTime.Utc
): TrackedChannel =>
  waiting(channel, DateTime.addDuration(at, accountRetryAfter));

/** The channel once the run `at` found Peal reads nothing on it. */
export const accountUnsupported = (
  channel: TrackedChannel,
  at: DateTime.Utc
): TrackedChannel =>
  waiting(channel, DateTime.addDuration(at, unsupportedAccountRetry));
