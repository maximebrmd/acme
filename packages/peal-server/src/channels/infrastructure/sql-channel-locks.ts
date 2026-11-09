import { Effect, Layer, Schedule, Schema, Semaphore } from "effect";
import { SqlClient } from "effect/sql";

import { ChannelLocks } from "#channels/application/channel-locks.ts";
import { DatabaseError } from "#shared/application/database-error.ts";

// Postgres advisory locks, in their two-key form: the first key names the
// channels' token locks, the second the channel. The two-key space never
// overlaps the one-key locks the cluster and the migrations take. Two
// channels whose ids hash alike only wait for each other.
const tryLock =
  "SELECT pg_try_advisory_lock(hashtext('peal-server/channels/tokens'), hashtext($1)) AS locked";

const unlock =
  "SELECT pg_advisory_unlock(hashtext('peal-server/channels/tokens'), hashtext($1))";

const decodeLocked = Schema.decodeUnknownEffect(
  Schema.Tuple([Schema.Struct({ locked: Schema.Boolean })])
);

// How long a refresh waits for the one holding the channel: longer than a
// platform call takes, which its HTTP client bounds.
const waitSchedule = Schedule.spaced("100 millis");

const waitAttempts = 600;

// How many locks a process holds, or waits for, at once. Each takes a
// connection from the pool for as long as it is held, and the work under it
// needs another: past the pool's size, every holder would wait for a
// connection only another holder could give back.
const defaultHeldAtOnce = 4;

/**
 * Channel locks held on a connection reserved for the work, which writes
 * through the pool as usual: its writes commit as they go, before the lock is
 * released, and a process that dies releases its locks with its connections.
 * At most `heldAtOnce` are held at a time in the process, so the pool always
 * has connections left for the work under them; the others wait their turn
 * without a connection.
 */
export const sqlChannelLocks = (heldAtOnce: number) =>
  Layer.effect(
    ChannelLocks,
    Effect.gen(function* SqlChannelLocks() {
      const sql = yield* SqlClient.SqlClient;
      const turns = yield* Semaphore.make(heldAtOnce);

      return ChannelLocks.of({
        withLock: (channelId, effect) =>
          Effect.scoped(
            Effect.gen(function* locked() {
              const connection = yield* sql.reserve.pipe(
                Effect.mapError((cause) => new DatabaseError({ cause }))
              );

              const acquired = yield* connection
                .execute(tryLock, [channelId], undefined)
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
                  cause: new Error(`Channel ${channelId} stayed locked`),
                });
              }

              return yield* effect.pipe(
                Effect.ensuring(
                  connection
                    .execute(unlock, [channelId], undefined)
                    .pipe(Effect.ignore)
                )
              );
            })
          ).pipe(Semaphore.withPermit(turns)),
      });
    })
  );

/** The channel locks, with the default share of the pool. */
export const SqlChannelLocks = sqlChannelLocks(defaultHeldAtOnce);
