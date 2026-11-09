import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Ref } from "effect";
import { SqlClient } from "effect/sql";

import { ChannelLocks } from "#channels/application/channel-locks.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/channels/support.ts";

// More channels at once than the pool has connections (ten).
const channelCount = 12;

const LocksTest = SqlChannelLocks.pipe(Layer.provideMerge(DatabaseTest));

layer(LocksTest, { excludeTestServices: true })("the channel locks", (it) => {
  it.effect("leave the pool connections for the work they guard", () =>
    Effect.gen(function* manyAtOnce() {
      const locks = yield* ChannelLocks;
      const sql = yield* SqlClient.SqlClient;

      const ids = yield* Effect.forEach(
        Array.from({ length: channelCount }),
        () => newId(ChannelIdSchema)
      );

      // Each holder writes through the pool, as a refresh saves its tokens:
      // were every connection held by a lock, none would finish.
      const done = yield* Effect.forEach(
        ids,
        (id) => locks.withLock(id, sql`SELECT 1 AS one`.pipe(Effect.as(id))),
        { concurrency: "unbounded" }
      ).pipe(Effect.timeoutOption("20 seconds"));

      assert.deepStrictEqual(done, Option.some(ids));
    })
  );

  it.effect("run the work on one channel alone", () =>
    Effect.gen(function* oneAtATime() {
      const locks = yield* ChannelLocks;
      const id = yield* newId(ChannelIdSchema);
      const inside = yield* Ref.make(0);
      const most = yield* Ref.make(0);

      const work = Effect.gen(function* guarded() {
        const now = yield* Ref.updateAndGet(inside, (count) => count + 1);

        yield* Ref.update(most, (seen) => Math.max(seen, now));
        yield* Effect.sleep("50 millis");
        yield* Ref.update(inside, (count) => count - 1);
      });

      yield* Effect.forEach(
        Array.from({ length: 3 }),
        () => locks.withLock(id, work),
        { concurrency: "unbounded", discard: true }
      );

      assert.strictEqual(yield* Ref.get(most), 1);
    })
  );
});
