import { Effect, Schedule, Schema, Semaphore } from "effect";
import { SqlClient } from "effect/sql";

import { DatabaseError } from "#shared/application/database-error.ts";

// Postgres advisory locks, in their two-key form: the first key names what
// is locked (`namespace`), the second the one locked. The two-key space
// never overlaps the one-key locks the cluster and the migrations take.
// Two keys that hash alike only wait for each other.

const tryLock =
  "SELECT pg_try_advisory_lock(hashtext($1), hashtext($2)) AS locked";

const unlock = "SELECT pg_advisory_unlock(hashtext($1), hashtext($2))";

const decodeLocked = Schema.decodeUnknownEffect(
  Schema.Tuple([Schema.Struct({ locked: Schema.Boolean })])
);

// How long a holder is waited for: longer than a platform call takes,
// which its HTTP client bounds.
const waitSchedule = Schedule.spaced("100 millis");

const waitAttempts = 600;

/** Runs `effect` while holding the lock on `key`, across every process. */
export type AdvisoryLock = <A, E, R>(
  key: string,
  effect: Effect.Effect<A, E, R>
) => Effect.Effect<A, DatabaseError | E, R>;

/**
 * Locks of `namespace`, each held on a connection reserved for the work,
 * which writes through the pool as usual: its writes commit as they go,
 * before the lock is released, and a process that dies releases its locks
 * with its connections. At most `heldAtOnce` are held at a time in the
 * process, so the pool always has connections left for the work under
 * them; the others wait their turn without a connection. A lock held
 * elsewhere for longer than a minute fails the wait (DatabaseError).
 */
export const advisoryLocks = (namespace: string, heldAtOnce: number) =>
  Effect.gen(function* advisoryLocksOf() {
    const sql = yield* SqlClient.SqlClient;
    const turns = yield* Semaphore.make(heldAtOnce);

    const withLock: AdvisoryLock = (key, effect) =>
      Effect.scoped(
        Effect.gen(function* locked() {
          const connection = yield* sql.reserve.pipe(
            Effect.mapError((cause) => new DatabaseError({ cause }))
          );

          const acquired = yield* connection
            .execute(tryLock, [namespace, key], undefined)
            .pipe(
              Effect.flatMap(decodeLocked),
              Effect.map(([row]) => row.locked),
              Effect.repeat({
                schedule: waitSchedule,
                times: waitAttempts,
                until: (held) => held,
              }),
              Effect.mapError((cause) => new DatabaseError({ cause }))
            );

          if (!acquired) {
            return yield* new DatabaseError({
              cause: new Error(`${namespace} ${key} stayed locked`),
            });
          }

          return yield* effect.pipe(
            Effect.ensuring(
              connection
                .execute(unlock, [namespace, key], undefined)
                .pipe(Effect.ignore)
            )
          );
        })
      ).pipe(Semaphore.withPermit(turns));

    return withLock;
  });
