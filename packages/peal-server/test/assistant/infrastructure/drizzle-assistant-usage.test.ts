import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { AssistantUsage } from "#assistant/application/ports/assistant-usage.ts";
import { DrizzleAssistantUsageLive } from "#assistant/infrastructure/drizzle-assistant-usage.ts";
import { DatabaseTest, freshWorkspace } from "#test/assistant/support.ts";

const ninth = { day: 9, month: 11, year: 2026 };
const tenth = { day: 10, month: 11, year: 2026 };

const UsageTest = DrizzleAssistantUsageLive.pipe(
  Layer.provideMerge(DatabaseTest)
);

layer(UsageTest)("the assistant's usage in Postgres", (it) => {
  it.effect("counts up to the limit, then claims nothing", () =>
    Effect.gen(function* limit() {
      const usage = yield* AssistantUsage;
      const workspaceId = yield* freshWorkspace;

      const claims = yield* Effect.forEach([1, 2, 3, 4], () =>
        usage.claim(workspaceId, ninth, 3, 1)
      );

      assert.deepStrictEqual(claims.map(Option.getOrNull), [1, 2, 3, null]);
      assert.strictEqual(yield* usage.used(workspaceId, ninth), 3);
    })
  );

  it.effect("lets no request past the limit when they arrive together", () =>
    Effect.gen(function* together() {
      const usage = yield* AssistantUsage;
      const workspaceId = yield* freshWorkspace;

      const claims = yield* Effect.all(
        Array.from({ length: 12 }, () => usage.claim(workspaceId, ninth, 5, 1)),
        { concurrency: "unbounded" }
      );

      assert.strictEqual(claims.filter(Option.isSome).length, 5);
      assert.strictEqual(yield* usage.used(workspaceId, ninth), 5);
    })
  );

  it.effect("keeps each day and each workspace apart", () =>
    Effect.gen(function* apart() {
      const usage = yield* AssistantUsage;
      const workspaceId = yield* freshWorkspace;
      const other = yield* freshWorkspace;

      yield* usage.claim(workspaceId, ninth, 1, 1);

      assert.isTrue(
        Option.isNone(yield* usage.claim(workspaceId, ninth, 1, 1))
      );
      assert.isTrue(
        Option.isSome(yield* usage.claim(workspaceId, tenth, 1, 1))
      );
      assert.isTrue(Option.isSome(yield* usage.claim(other, ninth, 1, 1)));
      assert.strictEqual(yield* usage.used(other, tenth), 0);
    })
  );

  it.effect(
    "counts the day across the workspaces of a pool, each keeping its own count",
    () =>
      Effect.gen(function* pooled() {
        const usage = yield* AssistantUsage;
        const workspaceId = yield* freshWorkspace;
        const other = yield* freshWorkspace;

        const withOther = Effect.succeed([other]);
        const withFirst = Effect.succeed([workspaceId]);

        yield* usage.claim(workspaceId, ninth, 3, 2, withOther);

        // Two of three used by the first: the other's first request of
        // the day, costing two, would pass the pool's limit.
        assert.isTrue(
          Option.isNone(yield* usage.claim(other, ninth, 3, 2, withFirst))
        );
        assert.deepStrictEqual(
          (yield* usage.claim(other, ninth, 3, 1, withFirst)).pipe(
            Option.getOrNull
          ),
          1
        );
        assert.isTrue(
          Option.isNone(yield* usage.claim(workspaceId, ninth, 3, 1, withOther))
        );
        assert.deepStrictEqual(
          yield* usage.usedIn([workspaceId, other], ninth),
          new Map([
            [workspaceId, 2],
            [other, 1],
          ])
        );
      })
  );

  it.effect(
    "lets no pooled request past the limit when the pool's workspaces ask together",
    () =>
      Effect.gen(function* pooledTogether() {
        const usage = yield* AssistantUsage;
        const first = yield* freshWorkspace;
        const second = yield* freshWorkspace;

        const claims = yield* Effect.all(
          Array.from({ length: 12 }, (_, index) =>
            index % 2 === 0
              ? usage.claim(first, ninth, 5, 1, Effect.succeed([second]))
              : usage.claim(second, ninth, 5, 1, Effect.succeed([first]))
          ),
          { concurrency: "unbounded" }
        );

        const used = yield* usage.usedIn([first, second], ninth);

        assert.strictEqual(claims.filter(Option.isSome).length, 5);
        assert.strictEqual(
          [...used.values()].reduce((sum, requests) => sum + requests, 0),
          5
        );
      })
  );

  it.effect("reads many workspaces' day in one call", () =>
    Effect.gen(function* many() {
      const usage = yield* AssistantUsage;
      const workspaceId = yield* freshWorkspace;
      const other = yield* freshWorkspace;
      const idle = yield* freshWorkspace;

      yield* usage.claim(workspaceId, ninth, 5, 1);
      yield* usage.claim(workspaceId, ninth, 5, 1);
      yield* usage.claim(other, ninth, 5, 1);
      yield* usage.claim(other, tenth, 5, 1);

      assert.deepStrictEqual(
        yield* usage.usedIn([workspaceId, other, idle], ninth),
        new Map([
          [workspaceId, 2],
          [other, 1],
        ])
      );
      assert.deepStrictEqual(yield* usage.usedIn([], ninth), new Map());
    })
  );

  it.effect("takes back a request, never below zero", () =>
    Effect.gen(function* release() {
      const usage = yield* AssistantUsage;
      const workspaceId = yield* freshWorkspace;

      yield* usage.claim(workspaceId, ninth, 2, 1);
      yield* usage.claim(workspaceId, ninth, 2, 1);
      yield* usage.release(workspaceId, ninth, 1);

      assert.strictEqual(yield* usage.used(workspaceId, ninth), 1);

      yield* usage.release(workspaceId, ninth, 1);
      yield* usage.release(workspaceId, ninth, 1);
      yield* usage.release(workspaceId, tenth, 1);

      assert.strictEqual(yield* usage.used(workspaceId, ninth), 0);
      assert.strictEqual(yield* usage.used(workspaceId, tenth), 0);
    })
  );

  it.effect("claims a request that costs several, never past the limit", () =>
    Effect.gen(function* costly() {
      const usage = yield* AssistantUsage;
      const workspaceId = yield* freshWorkspace;

      // Too costly for the day's whole allowance: nothing is counted.
      assert.isTrue(
        Option.isNone(yield* usage.claim(workspaceId, ninth, 3, 5))
      );
      assert.strictEqual(yield* usage.used(workspaceId, ninth), 0);

      const claims = yield* Effect.forEach([5, 1, 5, 1, 1], (cost) =>
        usage.claim(workspaceId, ninth, 12, cost)
      );

      // 5, 6, 11, 12, then the last one finds no room.
      assert.deepStrictEqual(claims.map(Option.getOrNull), [
        5,
        6,
        11,
        12,
        null,
      ]);

      yield* usage.release(workspaceId, ninth, 5);

      assert.strictEqual(yield* usage.used(workspaceId, ninth), 7);
    })
  );

  it.effect(
    "lets no costly request past the limit when they arrive together",
    () =>
      Effect.gen(function* together() {
        const usage = yield* AssistantUsage;
        const workspaceId = yield* freshWorkspace;

        const claims = yield* Effect.all(
          Array.from({ length: 8 }, () =>
            usage.claim(workspaceId, ninth, 12, 5)
          ),
          { concurrency: "unbounded" }
        );

        assert.strictEqual(claims.filter(Option.isSome).length, 2);
        assert.strictEqual(yield* usage.used(workspaceId, ninth), 10);
      })
  );

  it.effect("takes back a costly request, never below zero", () =>
    Effect.gen(function* floor() {
      const usage = yield* AssistantUsage;
      const workspaceId = yield* freshWorkspace;

      yield* usage.claim(workspaceId, ninth, 10, 2);
      yield* usage.release(workspaceId, ninth, 5);

      assert.strictEqual(yield* usage.used(workspaceId, ninth), 0);
    })
  );
});
