import { Duration, Effect } from "effect";

import type { SendAllowance } from "./ports/manual-sends.ts";
import { TooManyManualSends } from "./too-many-manual-sends.ts";

/** Fails with TooManyManualSends when the sends were not taken. */
export const refusedSends = (
  allowance: SendAllowance
): Effect.Effect<void, TooManyManualSends> =>
  allowance._tag === "taken"
    ? Effect.void
    : Effect.fail(
        new TooManyManualSends({
          allowed: allowance.allowed,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil(Duration.toSeconds(allowance.retryAfter))
          ),
        })
      );
