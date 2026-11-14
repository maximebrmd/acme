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
import { DatabaseError } from "#shared/application/database-error.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

const free = WorkspaceIdSchema.make("00000000-0000-4000-8000-00000000f001");
const paying = WorkspaceIdSchema.make("00000000-0000-4000-8000-00000000f002");
const raised = WorkspaceIdSchema.make("00000000-0000-4000-8000-00000000f003");

// A second workspace of the free one's billing account.
const sibling = WorkspaceIdSchema.make("00000000-0000-4000-8000-00000000f004");

const payer = UserIdSchema.make("00000000-0000-4000-8000-0000000000e1");
const member = UserIdSchema.make("00000000-0000-4000-8000-0000000000e2");

// What the test sets, and how often the limiter read it.
interface World {
  readonly paying: Set<WorkspaceId>;
  readonly payers: Set<UserId>;
  readonly overrides: Map<WorkspaceId, number>;
  failing: boolean;
  reads: number;
}

const worldOf = (): World => ({
  failing: false,
  overrides: new Map([[raised, 1200]]),
  payers: new Set([payer]),
  paying: new Set([paying]),
  reads: 0,
});

// Each workspace's billing account: the free one and its sibling share one.
const accountOf = (id: WorkspaceId) => (id === sibling ? free : id);

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

const standingsOf = (world: World) =>
  Layer.succeed(
    RequestStandings,
    RequestStandings.of({
      ofPayer: (userId) =>
        Effect.sync(() => {
          world.reads += 1;

          return {
            account: Option.some(`account-of-${userId}`),
            paying: world.payers.has(userId),
          };
        }),
      ofWorkspaces: (ids) =>
        Effect.suspend(() => {
          world.reads += 1;

          return world.failing
            ? Effect.fail(new DatabaseError({ cause: "synthetic" }))
            : Effect.succeed(
                new Map(
                  ids.map((id) => [
                    id,
                    {
                      account: Option.some<string>(accountOf(id)),
                      paying: world.paying.has(accountOf(id)),
                    },
                  ])
                )
              );
        }),
      withoutPaymentMethod: Option.some(60),
    })
  );

const overridesOf = (world: World) =>
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
  );

const limiterOver = (world: World, bills: boolean, setting = 600) =>
  RequestLimiter.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        countsInMemory,
        Layer.succeed(RequestPolicy, requestPolicy(setting)),
        Layer.succeed(SubjectDigest, (subject: string) =>
          Effect.succeed(subject)
        ),
        bills ? standingsOf(world) : RequestStandings.unbilled,
        overridesOf(world)
      )
    )
  );

const keyOf = (workspace: WorkspaceId): LimitHolder => ({
  _tag: "workspace",
  key: `workspace:${workspace}`,
  workspace: Effect.succeed(Option.some(workspace)),
});

const unbound = (
  userId: UserId,
  actingIn: Option.Option<WorkspaceId> = Option.none()
): LimitHolder => ({
  _tag: "payer",
  actingIn,
  key: `user:${userId}@${Option.getOrElse(actingIn, () => "-")}`,
  userId,
});

const sixtyOne = Array.from({ length: 61 }, (_, index) => index);

describe("the rate limit by standing", () => {
  it.effect(
    "gives 60 without a payment method, the setting with one, and staff's override",
    () => {
      const world = worldOf();

      return Effect.gen(function* tiers() {
        const limiter = yield* RequestLimiter;

        const onFree = yield* limiter.admit("key:a", keyOf(free));
        const onPaying = yield* limiter.admit("key:b", keyOf(paying));
        const onRaised = yield* limiter.admit("key:c", keyOf(raised));

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

  it.effect(
    "counts the free tier once per billing account, whatever keys and workspaces send",
    () => {
      const world = worldOf();

      return Effect.gen(function* shared() {
        const limiter = yield* RequestLimiter;

        yield* TestClock.setTime(Date.UTC(2026, 10, 14, 10, 0, 0));

        // Thirty from a key of one workspace, thirty from a key of another
        // workspace of the same account.
        for (const _ of sixtyOne.slice(0, 30)) {
          yield* limiter.admit("key:one", keyOf(free));
          yield* limiter.admit("key:two", keyOf(sibling));
        }

        assert.isFalse(
          (yield* limiter.admit("key:three", keyOf(free))).allowed
        );

        // A paying account's keys each count on their own.
        for (const _ of sixtyOne) {
          yield* limiter.admit("key:paying-one", keyOf(paying));
        }

        assert.isTrue(
          (yield* limiter.admit("key:paying-two", keyOf(paying))).allowed
        );
      }).pipe(Effect.provide(limiterOver(world, true)));
    }
  );

  it.effect(
    "gives a token bound to no workspace its user's own account's standing, and the override of the workspace it acts in",
    () => {
      const world = worldOf();

      return Effect.gen(function* unboundTokens() {
        const limiter = yield* RequestLimiter;

        // A member who pays for nothing, acting in a paying workspace.
        const memberIn = yield* limiter.admit(
          "oauth:cli:member",
          unbound(member, Option.some(paying))
        );

        // Someone who pays for their own account, acting anywhere.
        const payerAnywhere = yield* limiter.admit(
          "oauth:cli:payer",
          unbound(payer, Option.some(free))
        );

        // A free member acting in a workspace staff raised.
        const memberRaised = yield* limiter.admit(
          "oauth:cli:member",
          unbound(member, Option.some(raised))
        );

        assert.deepStrictEqual([memberIn.policy, memberIn.limit], ["free", 60]);
        assert.deepStrictEqual(
          [payerAnywhere.policy, payerAnywhere.limit],
          ["default", 600]
        );
        assert.deepStrictEqual(
          [memberRaised.policy, memberRaised.limit],
          ["override", 1200]
        );
      }).pipe(Effect.provide(limiterOver(world, true)));
    }
  );

  it.effect(
    "never gives the free tier more than a lower setting gives a payer",
    () => {
      const world = worldOf();

      return Effect.gen(function* lower() {
        const limiter = yield* RequestLimiter;
        const onFree = yield* limiter.admit("key:a", keyOf(free));

        assert.deepStrictEqual(
          [onFree.policy, onFree.limit, onFree.withPaymentMethod],
          ["free", 30, Option.none()]
        );
      }).pipe(Effect.provide(limiterOver(world, true, 30)));
    }
  );

  it.effect(
    "reads a holder's standing again once its minute in the cache is over",
    () => {
      const world = worldOf();

      return Effect.gen(function* expiry() {
        const limiter = yield* RequestLimiter;

        yield* TestClock.setTime(Date.UTC(2026, 10, 14, 10, 0, 0));

        assert.strictEqual(
          (yield* limiter.admit("key:x", keyOf(free))).limit,
          60
        );

        // A payment method added: within the minute, the kept policy holds.
        world.paying.add(free);
        yield* TestClock.adjust("59 seconds");

        assert.strictEqual(
          (yield* limiter.admit("key:x", keyOf(free))).limit,
          60
        );
        assert.strictEqual(world.reads, 1);

        yield* TestClock.adjust("1 second");

        const after = yield* limiter.admit("key:x", keyOf(free));

        assert.deepStrictEqual([after.policy, after.limit], ["default", 600]);
        assert.strictEqual(world.reads, 2);
      }).pipe(Effect.provide(limiterOver(world, true)));
    }
  );

  it.effect(
    "keeps the last policy a few seconds when reading the standing fails, asking nothing meanwhile",
    () => {
      const world = worldOf();

      return Effect.gen(function* failing() {
        const limiter = yield* RequestLimiter;

        yield* TestClock.setTime(Date.UTC(2026, 10, 14, 10, 0, 0));
        yield* limiter.admit("key:p", keyOf(paying));
        yield* TestClock.adjust("61 seconds");
        world.failing = true;

        const kept = yield* limiter.admit("key:p", keyOf(paying));

        assert.deepStrictEqual([kept.policy, kept.limit], ["default", 600]);

        yield* limiter.admit("key:p", keyOf(paying));
        assert.strictEqual(world.reads, 2);

        // Never known: the free tier's, a few seconds.
        const unknown = yield* limiter.admit("key:q", keyOf(raised));

        assert.deepStrictEqual([unknown.policy, unknown.limit], ["free", 60]);

        yield* TestClock.adjust("5 seconds");
        world.failing = false;

        assert.strictEqual(
          (yield* limiter.admit("key:q", keyOf(raised))).limit,
          1200
        );
      }).pipe(Effect.provide(limiterOver(world, true)));
    }
  );

  it.effect(
    "applies the setting to everyone, reading nothing, on a server that does not bill",
    () => {
      const world = worldOf();

      return Effect.gen(function* unbilled() {
        const limiter = yield* RequestLimiter;

        const standing = yield* limiter.admit("key:u", {
          _tag: "workspace",
          key: "workspace:unread",
          workspace: Effect.die("A server that does not bill reads nothing"),
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
