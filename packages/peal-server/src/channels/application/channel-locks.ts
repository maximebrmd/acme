import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

/**
 * Runs work on one channel's tokens alone, across every process: a refresh
 * that rotates tokens must not race another refresh, or a reconnect, of the
 * same channel, or the platform would end the session.
 */
export class ChannelLocks extends Context.Service<
  ChannelLocks,
  {
    readonly withLock: <A, E, R>(
      channelId: ChannelId,
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, DatabaseError | E, R>;
  }
>()("peal-server/channels/application/ChannelLocks") {}
