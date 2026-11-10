import { Effect, Schedule, Schema, Semaphore } from "effect";
import { SqlClient } from "effect/sql";

/**
 * What requests take turns on: a workspace's seats (its members and
 * pending invitations), under the key Peal's own invitations lock
 * (`WorkspacePeopleLive`), or the workspaces an account creates.
 */
export type TurnKind = "creations" | "seats";

// Postgres advisory locks, in their two-key form, as the channels' token
// locks: the first key names what is counted, the second whose.
const namespaces: Readonly<Record<TurnKind, string>> = {
  creations: "peal-server/workspace/creations",
  seats: "peal-server/workspace/invitations",
};

const tryLock =
  "SELECT pg_try_advisory_lock(hashtext($1), hashtext($2)) AS locked";

const unlock = "SELECT pg_advisory_unlock(hashtext($1), hashtext($2))";

const decodeLocked = Schema.decodeUnknownEffect(
  Schema.Tuple([Schema.Struct({ locked: Schema.Boolean })])
);

const waitSchedule = Schedule.spaced("50 millis");

// A route under a turn writes a few rows: 30 seconds is a server in
// trouble.
const waitAttempts = 600;

// How many turns a process holds, or waits for, at once: each takes a
// connection from the pool while it is held, and the route under it reads
// the workspace's plan through the pool too.
const heldAtOnce = 4;

/**
 * Runs Better Auth's routes that add to something a plan limits one at a
 * time for each workspace, or account: Better Auth counts, then writes,
 * without a lock, so two requests sent together would both find room. The
 * turn is a session advisory lock on a connection reserved for it, which a
 * process that dies gives back; Better Auth writes on its own pool, and
 * commits before the turn ends. A turn that cannot be taken is a defect:
 * the request answers 500, and nothing was written.
 */
export const makeTurns = Effect.gen(function* makeTurns() {
  const sql = yield* SqlClient.SqlClient;
  const turns = yield* Semaphore.make(heldAtOnce);

  return <A, E, R>(
    kind: TurnKind,
    key: string,
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R> =>
    Effect.scoped(
      Effect.gen(function* turn() {
        const connection = yield* sql.reserve.pipe(Effect.orDie);
        const keys = [namespaces[kind], key];

        const acquired = yield* connection
          .execute(tryLock, keys, undefined)
          .pipe(
            Effect.flatMap(decodeLocked),
            Effect.map(([row]) => row.locked),
            Effect.repeat({
              schedule: waitSchedule,
              times: waitAttempts,
              until: (held) => held,
            }),
            Effect.orDie
          );

        if (!acquired) {
          return yield* Effect.die(
            new Error(`The ${kind} of ${key} stayed locked`)
          );
        }

        return yield* effect.pipe(
          Effect.ensuring(
            connection.execute(unlock, keys, undefined).pipe(Effect.ignore)
          )
        );
      })
    ).pipe(Semaphore.withPermit(turns));
});
