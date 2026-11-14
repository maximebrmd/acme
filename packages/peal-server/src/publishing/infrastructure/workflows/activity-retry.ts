import { Effect, Schedule } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

// An activity's result is stored once and replayed, and a defect stored as a
// result ends the workflow. A database blip must not end it: the step retries
// for about three minutes, backing off up to 30 seconds, before it gives up.
const databaseRetry = Schedule.min([
  Schedule.exponential("200 millis", 2),
  Schedule.spaced("30 seconds"),
]);

/** Runs an activity's step, retrying it while the database fails. */
export const retryingDatabase = <A, R>(
  step: Effect.Effect<A, DatabaseError, R>
): Effect.Effect<A, never, R> =>
  step.pipe(Effect.retry({ schedule: databaseRetry, times: 10 }), Effect.orDie);

/**
 * Runs an activity's step, retrying it while the database fails, then
 * answering `fallback` rather than ending the workflow: for a step whose
 * work the journal makes safe to begin again, as an article's attempt.
 */
export const retryingDatabaseOr = <A, R>(
  step: Effect.Effect<A, DatabaseError, R>,
  fallback: A
): Effect.Effect<A, never, R> =>
  step.pipe(
    Effect.retry({ schedule: databaseRetry, times: 10 }),
    Effect.catchTag("DatabaseError", () => Effect.succeed(fallback))
  );
