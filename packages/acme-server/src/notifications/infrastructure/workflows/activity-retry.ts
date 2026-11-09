import { Effect, Schedule } from "effect";

// An activity's result is stored once and replayed, and a defect stored as a
// result ends the workflow. A database blip must not end it: the step retries
// for about three minutes, backing off up to 30 seconds, before it gives up.
const databaseRetry = Schedule.min([
  Schedule.exponential("200 millis", 2),
  Schedule.spaced("30 seconds"),
]);

/** Runs an activity's step, retrying it while the database fails. */
export const retryingDatabase = <A, E, R>(
  step: Effect.Effect<A, E, R>
): Effect.Effect<A, never, R> =>
  step.pipe(Effect.retry({ schedule: databaseRetry, times: 10 }), Effect.orDie);
