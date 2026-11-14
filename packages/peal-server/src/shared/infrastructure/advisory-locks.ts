import { Effect, Option, Schedule, Schema, Semaphore } from "effect";
import type { Scope } from "effect";
import { SqlClient } from "effect/sql";
import type { SqlConnection } from "effect/sql";

import { DatabaseError } from "#shared/application/database-error.ts";

// Postgres advisory locks, in their two-key form: the first key names what
// is locked (`namespace`), the second the one locked. The two-key space
// never overlaps the one-key locks the cluster and the migrations take.
// Two keys that hash alike only wait for each other.

const tryLockQuery =
  "SELECT pg_try_advisory_lock(hashtext($1), hashtext($2)) AS locked";

const unlockQuery = "SELECT pg_advisory_unlock(hashtext($1), hashtext($2))";

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
 * Runs `effect` while holding the lock on `key` when it is free now and
 * the process has a turn left: none, and nothing run, otherwise.
 */
export type AdvisoryTryLock = <A, E, R>(
  key: string,
  effect: Effect.Effect<A, E, R>
) => Effect.Effect<Option.Option<A>, DatabaseError | E, R>;

/**
 * Locks of `namespace`, each held on a connection reserved for the work,
 * which writes through the pool as usual: its writes commit as they go,
 * before the lock is released, and a process that dies releases its locks
 * with its connections. A lock taken is released whatever ends the work,
 * an interruption included: the query that takes it and the release it
 * arranges are one uninterruptible step. At most `heldAtOnce` are held, or
 * waited for, at a time in the process, so the pool always has
 * connections left for the work under them.
 *
 * - `withLock` waits for a holder, a minute at most (DatabaseError then),
 *   and for a turn of the process.
 * - `tryLock` waits for neither: work a holder may keep long gives back,
 *   and tries again later.
 */
export const advisoryLocks = (namespace: string, heldAtOnce: number) =>
  SqlClient.SqlClient.pipe(
    Effect.flatMap((sql) =>
      advisoryLocksOver(sql.reserve, namespace, heldAtOnce)
    )
  );

/**
 * `advisoryLocks` over the connections `reserve` gives. `tryLock` answers
 * none when no lock can be asked for, the database failing included: work
 * that waits for its turn keeps waiting through an outage.
 */
export const advisoryLocksOver = <E>(
  reserve: Effect.Effect<SqlConnection.Connection, E, Scope.Scope>,
  namespace: string,
  heldAtOnce: number
) => {
  // Runs `effect` once the lock is taken, `tries` times tried; none when
  // it never was. `unavailable` is what the database failing to take it
  // comes to.
  const holding = <A, E2, R>(
    key: string,
    effect: Effect.Effect<A, E2, R>,
    tries: number,
    unavailable: (
      failed: DatabaseError
    ) => Effect.Effect<boolean, DatabaseError>
  ) =>
    Effect.scoped(
      Effect.gen(function* locked() {
        const taken = yield* Effect.gen(function* taking() {
          const connection = yield* reserve.pipe(
            Effect.mapError((cause) => new DatabaseError({ cause }))
          );

          const once = Effect.uninterruptible(
            connection.execute(tryLockQuery, [namespace, key], undefined).pipe(
              Effect.flatMap(decodeLocked),
              Effect.map(([row]) => row.locked),
              Effect.mapError((cause) => new DatabaseError({ cause })),
              Effect.tap((held) =>
                held
                  ? Effect.addFinalizer(() =>
                      connection
                        .execute(unlockQuery, [namespace, key], undefined)
                        .pipe(Effect.ignore)
                    )
                  : Effect.void
              )
            )
          );

          return tries <= 1
            ? yield* once
            : yield* once.pipe(
                Effect.repeat({
                  schedule: waitSchedule,
                  times: tries - 1,
                  until: (held) => held,
                })
              );
        }).pipe(Effect.catch(unavailable));

        return taken ? Option.some(yield* effect) : Option.none<A>();
      })
    );

  return Effect.gen(function* advisoryLocksOf() {
    const turns = yield* Semaphore.make(heldAtOnce);

    const withLock: AdvisoryLock = (key, effect) =>
      holding(key, effect, waitAttempts + 1, Effect.fail).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () =>
              Effect.fail(
                new DatabaseError({
                  cause: new Error(`${namespace} ${key} stayed locked`),
                })
              ),
            onSome: Effect.succeed,
          })
        ),
        Semaphore.withPermit(turns)
      );

    const tryLock: AdvisoryTryLock = (key, effect) =>
      holding(key, effect, 1, () => Effect.succeed(false)).pipe(
        Semaphore.withPermitsIfAvailable(turns, 1),
        Effect.map(Option.flatten)
      );

    return { tryLock, withLock };
  });
};
