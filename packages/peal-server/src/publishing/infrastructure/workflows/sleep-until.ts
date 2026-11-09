import { DateTime, Duration, Effect } from "effect";
import { DurableClock } from "effect/workflow";

/**
 * Sleeps durably until `at`: the wake-up is stored, so it survives restarts.
 *
 * The workflow body replays from the top each time it wakes. A replay before
 * the wake-up schedules the same clock again, which storage ignores, so the
 * first wake-up time stands. A replay after it finds no time left and goes on.
 */
export const sleepUntil = Effect.fn("sleepUntil")(function* sleepUntil(
  name: string,
  at: DateTime.Utc
) {
  const remaining = DateTime.distance(yield* DateTime.now, at);

  if (Duration.isLessThanOrEqualTo(remaining, Duration.zero)) {
    return;
  }

  // Never an in-memory sleep, which a restart would lose.
  yield* DurableClock.sleep({
    duration: remaining,
    inMemoryThreshold: Duration.zero,
    name,
  });
});
