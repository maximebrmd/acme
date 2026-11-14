import { Effect, Layer } from "effect";

import { ArticleSendTurns } from "#publishing/application/article-send-turns.ts";
import { advisoryLocks } from "#shared/infrastructure/advisory-locks.ts";

// Sends to sites held at once in a process: each holds a connection of
// the pool while its uploads and its post's call run.
const heldAtOnce = 2;

/** ArticleSendTurns on Postgres advisory locks, one per channel. */
export const SqlArticleSendTurns = Layer.effect(
  ArticleSendTurns,
  advisoryLocks("peal-server/publishing/article-sends", heldAtOnce).pipe(
    Effect.map((withLock) =>
      ArticleSendTurns.of({
        inTurn: (channelId, effect) => withLock(channelId, effect),
      })
    )
  )
);
