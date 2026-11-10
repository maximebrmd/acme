import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { AccountReading } from "#analytics/domain/account-metrics.ts";
import type { TrackedChannel } from "#analytics/domain/tracked-channel.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

/** A channel just read, as it waits now, with what the read found. */
export interface AccountRead {
  readonly channel: TrackedChannel;
  readonly collectedAt: DateTime.Utc;
  readonly reading: AccountReading;
}

/**
 * The channels whose accounts analytics reads, and what it read of each:
 * one snapshot a channel and a UTC day, with the counters read that day
 * and what the platform counted for it.
 */
export class TrackedChannels extends Context.Service<
  TrackedChannels,
  {
    /**
     * Starts following these channels; one already followed stays as it
     * is, and one of a workspace erased since it was listed is passed
     * over. Answers how many were new.
     */
    readonly follow: (
      channels: readonly TrackedChannel[]
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * `limit` of the channels due to be read by `at`, the one that waited
     * longest first.
     */
    readonly due: (
      at: DateTime.Utc,
      limit: number
    ) => Effect.Effect<readonly TrackedChannel[], DatabaseError>;
    /** How many channels are due to be read by `at`. */
    readonly countDue: (
      at: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Saves what was read: each channel's schedule, its counters under the
     * UTC day they were read on, and each day its platform counted, in one
     * statement a table. A day read before keeps what this read does not
     * tell; a channel no longer followed keeps nothing.
     */
    readonly saveReadings: (
      reads: readonly AccountRead[]
    ) => Effect.Effect<void, DatabaseError>;
    /** Saves when the channels are read next, in one statement. */
    readonly saveSchedules: (
      channels: readonly TrackedChannel[]
    ) => Effect.Effect<void, DatabaseError>;
    /** Stops following these channels, and deletes what was read of them. */
    readonly forget: (
      channelIds: readonly ChannelId[]
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/analytics/application/TrackedChannels") {}
