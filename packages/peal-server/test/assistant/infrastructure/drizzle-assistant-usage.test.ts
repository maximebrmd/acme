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
        usage.claim(workspaceId, ninth, 3)
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
        Array.from({ length: 12 }, () => usage.claim(workspaceId, ninth, 5)),
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

      yield* usage.claim(workspaceId, ninth, 1);

      assert.isTrue(Option.isNone(yield* usage.claim(workspaceId, ninth, 1)));
      assert.isTrue(Option.isSome(yield* usage.claim(workspaceId, tenth, 1)));
      assert.isTrue(Option.isSome(yield* usage.claim(other, ninth, 1)));
      assert.strictEqual(yield* usage.used(other, tenth), 0);
    })
  );

  it.effect("reads many workspaces' day in one call", () =>
    Effect.gen(function* many() {
      const usage = yield* AssistantUsage;
      const workspaceId = yield* freshWorkspace;
      const other = yield* freshWorkspace;
      const idle = yield* freshWorkspace;

      yield* usage.claim(workspaceId, ninth, 5);
      yield* usage.claim(workspaceId, ninth, 5);
      yield* usage.claim(other, ninth, 5);
      yield* usage.claim(other, tenth, 5);

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

      yield* usage.claim(workspaceId, ninth, 2);
      yield* usage.claim(workspaceId, ninth, 2);
      yield* usage.release(workspaceId, ninth);

      assert.strictEqual(yield* usage.used(workspaceId, ninth), 1);

      yield* usage.release(workspaceId, ninth);
      yield* usage.release(workspaceId, ninth);
      yield* usage.release(workspaceId, tenth);

      assert.strictEqual(yield* usage.used(workspaceId, ninth), 0);
      assert.strictEqual(yield* usage.used(workspaceId, tenth), 0);
    })
  );
});
