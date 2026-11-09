import { assert, describe, expect, it } from "@effect/vitest";
import { Effect, Fiber, Ref } from "effect";
import { TestClock } from "effect/testing";

import { isRetryable, maxAttempts, withRetry } from "#media/retry.ts";
import { TransferFailed } from "#media/transfer-failed.ts";

// A request that fails with these statuses in turn, then succeeds, and
// counts how often it was sent.
const flaky = Effect.fn("flaky")(function* flaky(
  statuses: readonly (number | null)[]
) {
  const attempts = yield* Ref.make(0);

  const send = Ref.getAndUpdate(attempts, (count) => count + 1).pipe(
    Effect.flatMap((attempt) => {
      const status = statuses[attempt];

      return status === undefined
        ? Effect.void
        : Effect.fail(new TransferFailed({ status }));
    })
  );

  return { attempts, send };
});

describe(isRetryable, () => {
  it.each([null, 408, 429, 500, 502, 503, 504])("tries %s again", (status) => {
    expect(isRetryable(new TransferFailed({ status }))).toBeTruthy();
  });

  it.each([400, 403, 404, 412])("gives up on %i", (status) => {
    expect(isRetryable(new TransferFailed({ status }))).toBeFalsy();
  });
});

describe(withRetry, () => {
  it.effect("sends again after a dropped connection and a busy store", () =>
    Effect.gen(function* recovers() {
      const { attempts, send } = yield* flaky([null, 503, 429]);
      const fiber = yield* Effect.forkChild(withRetry(send));

      yield* TestClock.adjust("1 minute");
      yield* Fiber.join(fiber);

      assert.strictEqual(yield* Ref.get(attempts), 4);
    })
  );

  it.effect("waits longer before each try", () =>
    Effect.gen(function* backsOff() {
      const { attempts, send } = yield* flaky([503, 503, 503]);
      const fiber = yield* Effect.forkChild(withRetry(send));

      // About 1 second, then 2, then 4, give or take a fifth: the second
      // try comes 0.8 to 1.2 s in, the third 2.4 to 3.6 s, the last 5.6 to
      // 8.4 s.
      yield* TestClock.adjust("700 millis");
      assert.strictEqual(yield* Ref.get(attempts), 1);

      yield* TestClock.adjust("600 millis");
      assert.strictEqual(yield* Ref.get(attempts), 2);

      yield* TestClock.adjust("1000 millis");
      assert.strictEqual(yield* Ref.get(attempts), 2);

      yield* TestClock.adjust("1400 millis");
      assert.strictEqual(yield* Ref.get(attempts), 3);

      yield* TestClock.adjust("1800 millis");
      assert.strictEqual(yield* Ref.get(attempts), 3);

      yield* TestClock.adjust("3 seconds");
      yield* Fiber.join(fiber);

      assert.strictEqual(yield* Ref.get(attempts), 4);
    })
  );

  it.effect(`gives up after ${maxAttempts} tries`, () =>
    Effect.gen(function* givesUp() {
      const { attempts, send } = yield* flaky(
        Array.from({ length: 10 }, () => 503)
      );

      const fiber = yield* Effect.forkChild(withRetry(send));

      yield* TestClock.adjust("5 minutes");

      const failure = yield* Effect.flip(Fiber.join(fiber));

      assert.strictEqual(failure.status, 503);
      assert.strictEqual(yield* Ref.get(attempts), maxAttempts);
    })
  );

  it.effect("does not send a refused request again", () =>
    Effect.gen(function* refused() {
      const { attempts, send } = yield* flaky([403]);
      const failure = yield* Effect.flip(withRetry(send));

      assert.strictEqual(failure.status, 403);
      assert.strictEqual(yield* Ref.get(attempts), 1);
    })
  );
});
