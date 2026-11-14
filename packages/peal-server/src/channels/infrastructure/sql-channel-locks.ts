import { Effect, Layer } from "effect";

import { ChannelLocks } from "#channels/application/channel-locks.ts";
import { advisoryLocks } from "#shared/infrastructure/advisory-locks.ts";

// How many locks a process holds, or waits for, at once. Each takes a
// connection from the pool for as long as it is held, and the work under it
// needs another: past the pool's size, every holder would wait for a
// connection only another holder could give back.
const defaultHeldAtOnce = 4;

/**
 * Channel locks on Postgres advisory locks (`advisoryLocks`), named for
 * the channels' tokens: at most `heldAtOnce` held at a time in the process.
 */
export const sqlChannelLocks = (heldAtOnce: number) =>
  Layer.effect(
    ChannelLocks,
    advisoryLocks("peal-server/channels/tokens", heldAtOnce).pipe(
      Effect.map(({ withLock }) =>
        ChannelLocks.of({
          withLock: (channelId, effect) => withLock(channelId, effect),
        })
      )
    )
  );

/** The channel locks, with the default share of the pool. */
export const SqlChannelLocks = sqlChannelLocks(defaultHeldAtOnce);
