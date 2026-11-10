import { Config, Effect, Layer } from "effect";

import { CurrentThreadedPlatforms } from "#publishing/application/threaded-platforms.ts";

/**
 * `X_THREADS`: whether the server sends a post's later parts to X, as
 * replies to the part before, true unless set. X's documentation says an
 * app on self-serve access may reply only to a post whose author mentioned
 * or quoted the replying account; whether that holds for a reply to the
 * account's own post is not documented. An operator whose app X refuses
 * replies turns it off: X then takes a post alone, which scheduling,
 * sending and the capabilities say.
 */
export const xThreadsConfig = Config.Boolean("X_THREADS").pipe(
  Config.withDefault(true)
);

/** The platforms that take parts, as the operator set X's. */
export const XThreadsLive = Layer.effect(
  CurrentThreadedPlatforms,
  xThreadsConfig.pipe(
    Effect.map((xThreads) => ({
      takesParts: (platform: string) => platform !== "x" || xThreads,
    }))
  )
);
