import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Schema } from "effect";
import { TestClock } from "effect/testing";

import { Ids } from "#shared/application/ids.ts";
import { Uuid7Schema } from "#shared/domain/ids.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";

const isUuid7 = Schema.is(Uuid7Schema);

describe("the SecureRandom Ids adapter", () => {
  it.effect("issues distinct UUIDv7s in the order it issued them", () =>
    Effect.gen(function* distinctAndOrdered() {
      const ids = yield* Ids;
      const issued = yield* Effect.replicateEffect(ids.next, 200);

      assert.isTrue(issued.every(isUuid7));
      assert.strictEqual(new Set(issued).size, issued.length);
      assert.deepStrictEqual(issued.toSorted(), issued);
    }).pipe(Effect.provide(IdsLive))
  );

  it.effect("stamps each id with the Clock's time", () =>
    Effect.gen(function* stampsClockTime() {
      const now = DateTime.makeUnsafe("2026-11-09T12:00:00Z");

      yield* TestClock.setTime(DateTime.toEpochMillis(now));

      const id = yield* Ids.use((ids) => ids.next);

      const timestamp = DateTime.toEpochMillis(now)
        .toString(16)
        .padStart(12, "0");

      // The first 48 bits, the first 12 hex digits, are the Unix time in ms.
      assert.strictEqual(id.replace("-", "").slice(0, 12), timestamp);
    }).pipe(Effect.provide(IdsLive))
  );
});
