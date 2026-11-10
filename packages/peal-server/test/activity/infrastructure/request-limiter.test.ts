import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { TestClock } from "effect/testing";

import { RequestLimiter } from "#activity/application/request-limiter.ts";
import { RequestPolicy } from "#activity/application/request-policy.ts";
import { requestPolicy } from "#activity/domain/rate-limit.ts";
import { DrizzleRequestCounts } from "#activity/infrastructure/drizzle-request-counts.ts";
import { SubjectDigestLive } from "#activity/infrastructure/request-policy.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";

// Three requests a minute.
const LimiterTest = RequestLimiter.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      DrizzleRequestCounts,
      SubjectDigestLive,
      Layer.succeed(RequestPolicy, requestPolicy(3))
    )
  ),
  Layer.provideMerge(MigrationsLive),
  Layer.provideMerge(DatabaseLive)
);

// A credential no other test counts for.
const newSubject = () => `key:${randomUUID()}`;

// A minute of its own, 18 seconds in, before the test clock's own start
// (1970): moving the clock back runs none of the sleeps the database pool
// waits on, and no other suite has rows there.
const startOfTest = Effect.sync(
  () =>
    Date.UTC(1900, 0, 1, 0, 0, 18) + Math.floor(Math.random() * 1e6) * 60_000
);

layer(LimiterTest)("the request limiter, on Postgres", (it) => {
  it.effect("allows the limit in a window, then refuses until it ends", () =>
    Effect.gen(function* window() {
      const limiter = yield* RequestLimiter;
      const subject = newSubject();

      yield* TestClock.setTime(yield* startOfTest);

      const standings = yield* Effect.forEach([1, 2, 3, 4, 5], () =>
        limiter.admit(subject)
      );

      assert.deepStrictEqual(
        standings.map(({ allowed, remaining }) => [allowed, remaining]),
        [
          [true, 2],
          [true, 1],
          [true, 0],
          [false, 0],
          [false, 0],
        ]
      );
      assert.strictEqual(standings[0]?.resetAfterSeconds, 42);
      assert.strictEqual(standings[0]?.limit, 3);

      // The next window starts the count again.
      yield* TestClock.adjust("42 seconds");

      const next = yield* limiter.admit(subject);

      assert.deepStrictEqual(
        [next.allowed, next.remaining, next.resetAfterSeconds],
        [true, 2, 60]
      );
    })
  );

  it.effect("counts each credential on its own", () =>
    Effect.gen(function* apart() {
      const limiter = yield* RequestLimiter;
      const one = newSubject();

      yield* TestClock.setTime(yield* startOfTest);

      yield* Effect.forEach([1, 2, 3, 4], () => limiter.admit(one));

      const other = yield* limiter.admit(newSubject());

      assert.isTrue(other.allowed);
      assert.strictEqual(other.remaining, 2);
    })
  );

  it.effect("lets no request past the limit when they arrive together", () =>
    Effect.gen(function* together() {
      const limiter = yield* RequestLimiter;
      const subject = newSubject();

      yield* TestClock.setTime(yield* startOfTest);

      const standings = yield* Effect.all(
        Array.from({ length: 12 }, () => limiter.admit(subject)),
        { concurrency: "unbounded" }
      );

      assert.strictEqual(standings.filter(({ allowed }) => allowed).length, 3);
    })
  );

  it.effect("forgets the counts of windows long past", () =>
    Effect.gen(function* purge() {
      const limiter = yield* RequestLimiter;
      const subject = newSubject();
      const start = yield* startOfTest;

      yield* TestClock.setTime(start);
      yield* Effect.forEach([1, 2, 3, 4], () => limiter.admit(subject));

      // Within the hour, the count is kept: the window is still refused.
      yield* TestClock.setTime(start + 30_000);
      yield* limiter.purge;

      assert.isFalse((yield* limiter.admit(subject)).allowed);

      // Past it, the row is gone.
      yield* TestClock.setTime(start + 2 * 3_600_000);

      assert.isAbove(yield* limiter.purge, 0);
    })
  );
});
