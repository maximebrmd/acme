// The rate limit's policy by standing, on a server that bills and on one
// that does not: counts in memory, standings and overrides as the test
// sets them, and the cache of each holder's policy on the test clock.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { RequestCounts } from "#activity/application/request-counts.ts";
import { RequestLimitOverrides } from "#activity/application/request-limit-overrides.ts";
import { RequestLimiter } from "#activity/application/request-limiter.ts";
import type { LimitHolder } from "#activity/application/request-limiter.ts";
import { RequestPolicy } from "#activity/application/request-policy.ts";
import { RequestStandings } from "#activity/application/request-standings.ts";
import { SubjectDigest } from "#activity/application/subject-digest.ts";
import { requestPolicy } from "#activity/domain/rate-limit.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

const free = WorkspaceIdSchema.make("00000000-0000-4000-8000-00000000f001");
const paying = WorkspaceIdSchema.make("00000000-0000-4000-8000-00000000f002");
const raised = WorkspaceIdSchema.make("00000000-0000-4000-8000-00000000f003");

// What the test sets, and how often the limiter read it.
interface World {
  readonly paying: Set<WorkspaceId>;
  readonly overrides: Map<WorkspaceId, number>;
  reads: number;
}

const worldOf = (): World => ({
  overrides: new Map([[raised, 1200]]),
  paying: new Set([paying]),
  reads: 0,
});

const countsInMemory = Layer.effect(
  RequestCounts,
  Effect.gen(function* countsInMemory() {
    const rows = yield* Ref.make(new Map<string, number>());

    return RequestCounts.of({
      count: (subject, window) =>
        Ref.modify(rows, (counted) => {
          const key = `${subject}@${DateTime.formatIso(window)}`;
          const next = (counted.get(key) ?? 0) + 1;

          return [next, new Map(counted).set(key, next)];
        }),
      purge: () => Effect.succeed(0),
    });
  })
);

const limiterOver = (world: World, bills: boolean) =>
  RequestLimiter.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        countsInMemory,
        Layer.succeed(RequestPolicy, requestPolicy(600)),
        Layer.succeed(SubjectDigest, (subject: string) =>
          Effect.succeed(subject)
        ),
        bills
          ? Layer.succeed(
              RequestStandings,
              RequestStandings.of({
                paying: (ids) =>
                  Effect.sync(() => {
                    world.reads += 1;

                    return new Set(ids.filter((id) => world.paying.has(id)));
                  }),
                withoutPaymentMethod: Option.some(60),
              })
            )
          : RequestStandings.unbilled,
        Layer.succeed(
          RequestLimitOverrides,
          RequestLimitOverrides.of({
            of: (ids) =>
              Effect.succeed(
                new Map(
                  ids.flatMap((id) => {
                    const limit = world.overrides.get(id);

                    return limit === undefined
                      ? []
                      : [
                          [
                            id,
                            {
                              requestsPerMinute: limit,
                              setAt: DateTime.makeUnsafe(0),
                              workspaceId: id,
                            },
                          ] as const,
                        ];
                  })
                )
              ),
            remove: () => Effect.void,
            set: () => Effect.void,
          })
        )
      )
    )
  );

const holder = (...workspaces: WorkspaceId[]): LimitHolder => ({
  key: `workspace:${workspaces.join(",")}`,
  workspaces: Effect.succeed(workspaces),
});

describe("the rate limit by standing", () => {
  it.effect(
    "gives 60 without a payment method, the setting with one, and staff's override",
    () => {
      const world = worldOf();

      return Effect.gen(function* tiers() {
        const limiter = yield* RequestLimiter;

        const onFree = yield* limiter.admit("key:a", holder(free));
        const onPaying = yield* limiter.admit("key:b", holder(paying));
        const onRaised = yield* limiter.admit("key:c", holder(raised));

        assert.deepStrictEqual(
          [onFree.policy, onFree.limit, onFree.withPaymentMethod],
          ["free", 60, Option.some(600)]
        );
        assert.deepStrictEqual(
          [onPaying.policy, onPaying.limit, onPaying.withPaymentMethod],
          ["default", 600, Option.none()]
        );
        assert.deepStrictEqual(
          [onRaised.policy, onRaised.limit, onRaised.withPaymentMethod],
          ["override", 1200, Option.none()]
        );
      }).pipe(Effect.provide(limiterOver(world, true)));
    }
  );

  it.effect("refuses the 61st request of a minute on the free tier", () => {
    const world = worldOf();

    return Effect.gen(function* sixtyOne() {
      const limiter = yield* RequestLimiter;

      const standings = yield* Effect.forEach(
        Array.from({ length: 61 }, (_, index) => index),
        () => limiter.admit("key:free", holder(free))
      );

      assert.isTrue(standings[59]?.allowed);
      assert.isFalse(standings[60]?.allowed);
      // One read for the minute: the policy is kept.
      assert.strictEqual(world.reads, 1);
    }).pipe(Effect.provide(limiterOver(world, true)));
  });

  it.effect(
    "reads a holder's standing again once its minute in the cache is over",
    () => {
      const world = worldOf();

      return Effect.gen(function* expiry() {
        const limiter = yield* RequestLimiter;

        yield* TestClock.setTime(Date.UTC(2026, 10, 14, 10, 0, 0));

        assert.strictEqual(
          (yield* limiter.admit("key:x", holder(free))).limit,
          60
        );

        // A payment method added: within the minute, the kept policy holds.
        world.paying.add(free);
        yield* TestClock.adjust("59 seconds");

        assert.strictEqual(
          (yield* limiter.admit("key:x", holder(free))).limit,
          60
        );
        assert.strictEqual(world.reads, 1);

        yield* TestClock.adjust("1 second");

        const after = yield* limiter.admit("key:x", holder(free));

        assert.deepStrictEqual([after.policy, after.limit], ["default", 600]);
        assert.strictEqual(world.reads, 2);
      }).pipe(Effect.provide(limiterOver(world, true)));
    }
  );

  it.effect("gives the most generous of a person's workspaces", () => {
    const world = worldOf();

    return Effect.gen(function* across() {
      const limiter = yield* RequestLimiter;
      const standing = yield* limiter.admit("oauth:c:u", holder(free, paying));

      assert.strictEqual(standing.limit, 600);
    }).pipe(Effect.provide(limiterOver(world, true)));
  });

  it.effect(
    "applies the setting to everyone, reading nothing, on a server that does not bill",
    () => {
      const world = worldOf();

      return Effect.gen(function* unbilled() {
        const limiter = yield* RequestLimiter;

        const standing = yield* limiter.admit("key:u", {
          key: "workspace:unread",
          workspaces: Effect.die("A server that does not bill reads nothing"),
        });

        assert.deepStrictEqual(
          [standing.policy, standing.limit, standing.withPaymentMethod],
          ["default", 600, Option.none()]
        );
        assert.strictEqual(world.reads, 0);
      }).pipe(Effect.provide(limiterOver(world, false)));
    }
  );
});
