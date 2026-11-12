import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Fiber, Option } from "effect";
import { TestClock } from "effect/testing";
import type { Overview, WorkspaceOverview } from "peal-contract";

import { overviewPages } from "#overview/pages.ts";

const workspace = (id: string): WorkspaceOverview => ({
  channels: { connected: 1, off: 0, toReconnect: 0 },
  id,
  inbox: { unanswered: 0 },
  name: `Synthetic ${id}`,
  overPlan: false,
  posts: {
    awaitingApproval: 0,
    failedLast7Days: 0,
    mayApprove: false,
    scheduledNext7Days: 0,
    unconfirmedLast7Days: 0,
  },
  refused: null,
  role: "viewer",
  slug: id,
});

// Pages of one workspace each, the next named by its number.
const pageOf = (index: number, last: number): Overview => ({
  generatedAt: DateTime.makeUnsafe(0),
  nextCursor: index === last ? null : String(index + 1),
  workspaces: [workspace(`w${String(index)}`)],
});

const indexOf = (cursor: Option.Option<string>) =>
  Option.match(cursor, { onNone: () => 0, onSome: Number });

describe("the overview's pages", () => {
  it.effect("are read one after the other, until the last", () =>
    Effect.gen(function* all() {
      const read = yield* overviewPages((cursor) =>
        Effect.succeed(pageOf(indexOf(cursor), 2))
      );

      assert.deepStrictEqual([...read.keys()], ["w0", "w1", "w2"]);
    })
  );

  it.effect("keep the pages read before one that fails", () =>
    Effect.gen(function* failing() {
      const read = yield* overviewPages((cursor) =>
        indexOf(cursor) === 2
          ? Effect.fail("synthetic outage")
          : Effect.succeed(pageOf(indexOf(cursor), 5))
      );

      assert.deepStrictEqual([...read.keys()], ["w0", "w1"]);
    })
  );

  it.effect("keep the pages read before one that takes too long", () =>
    Effect.gen(function* slow() {
      const fiber = yield* overviewPages((cursor) =>
        indexOf(cursor) === 2
          ? Effect.never
          : Effect.succeed(pageOf(indexOf(cursor), 5)).pipe(
              Effect.delay("4 seconds")
            )
      ).pipe(Effect.forkChild);

      // Each page has its own time: two pages of four seconds pass.
      yield* TestClock.adjust("8 seconds");
      yield* TestClock.adjust("5 seconds");

      const read = yield* Fiber.join(fiber);

      assert.deepStrictEqual([...read.keys()], ["w0", "w1"]);
    })
  );

  it.effect(
    "stop once the home's whole budget is spent, keeping the pages read by then",
    () =>
      Effect.gen(function* budget() {
        // Every page answers, each in 3 seconds: the third starts with 2
        // seconds left of the 8, and is cut short.
        const fiber = yield* overviewPages((cursor) =>
          Effect.succeed(pageOf(indexOf(cursor), 10)).pipe(
            Effect.delay("3 seconds")
          )
        ).pipe(Effect.forkChild);

        yield* TestClock.adjust("8 seconds");

        const read = yield* Fiber.join(fiber);

        assert.deepStrictEqual([...read.keys()], ["w0", "w1"]);
      })
  );

  it.effect("start no page once the budget is spent", () =>
    Effect.gen(function* spent() {
      // Two pages of 4 seconds use the whole budget: no third is asked.
      const asked: number[] = [];

      const fiber = yield* overviewPages((cursor) =>
        Effect.sync(() => asked.push(indexOf(cursor))).pipe(
          Effect.andThen(Effect.succeed(pageOf(indexOf(cursor), 10))),
          Effect.delay("4 seconds")
        )
      ).pipe(Effect.forkChild);

      yield* TestClock.adjust("8 seconds");

      const read = yield* Fiber.join(fiber);

      assert.deepStrictEqual([...read.keys()], ["w0", "w1"]);
      assert.deepStrictEqual(asked, [0, 1]);
    })
  );

  it.effect("stop after the most pages they hold", () =>
    Effect.gen(function* most() {
      const read = yield* overviewPages((cursor) =>
        Effect.succeed(pageOf(indexOf(cursor), 1000))
      );

      assert.strictEqual(read.size, 20);
    })
  );
});
