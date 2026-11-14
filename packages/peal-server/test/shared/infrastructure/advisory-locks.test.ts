// A lock's turn, when the database cannot be reached: work that waits for
// its turn hears "not now" and keeps waiting, while work that holds the
// lock to change something fails, as before.
import { assert, describe, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { advisoryLocksOver } from "#shared/infrastructure/advisory-locks.ts";

// A pool that gives no connection, as through a database outage.
const unreachable = Effect.fail("synthetic outage");

describe("advisory locks through a database outage", () => {
  it.effect("answer a try as not now, and run nothing", () =>
    Effect.gen(function* tried() {
      const { tryLock } = yield* advisoryLocksOver(
        unreachable,
        "peal-server/test/outage",
        2
      );

      let ran = false;

      const answer = yield* tryLock(
        "synthetic-key",
        Effect.sync(() => {
          ran = true;
        })
      );

      assert.isTrue(Option.isNone(answer));
      assert.isFalse(ran);
    })
  );

  it.effect("fail work that waits to hold the lock", () =>
    Effect.gen(function* waited() {
      const { withLock } = yield* advisoryLocksOver(
        unreachable,
        "peal-server/test/outage",
        2
      );

      const failed = yield* withLock("synthetic-key", Effect.void).pipe(
        Effect.flip
      );

      assert.strictEqual(failed._tag, "DatabaseError");
    })
  );
});
