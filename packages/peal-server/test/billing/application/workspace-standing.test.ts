// A workspace over its plan, as after its trial: what it holds beyond the
// plan, and coming back within it by choosing what stays. On ports in
// memory: the channels and members are lists, and what was removed a log.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref, Schema } from "effect";

import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { AccountPayers } from "#billing/application/ports/account-payers.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { WorkspaceHoldings } from "#billing/application/ports/workspace-holdings.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { ReduceWorkspace } from "#billing/application/reduce-workspace.ts";
import { WorkspaceStanding } from "#billing/application/workspace-standing.ts";
import { ReductionRefused } from "#billing/domain/reduction-refused.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import type { PaidPlan, Plan } from "#shared/domain/plan.ts";
import {
  aloneAccountOf,
  everyWorkspaceOn,
  UnmeteredTest,
} from "#test/billing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const workspaceId = WorkspaceIdSchema.make(
  "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b"
);

const userId = UserIdSchema.make("6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b9c");

const staffId = UserIdSchema.make("7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d");

const payerId = UserIdSchema.make("8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e");

const decodeUserId = Schema.decodeUnknownOption(UserIdSchema);

const inPerson: Actor["subject"] = {
  _tag: "user",
  impersonatedBy: Option.none(),
  userId,
};

const actorAs = (
  permissions: readonly Permission[] = permissionsFor("owner"),
  subject: Actor["subject"] = inPerson
) => new Actor({ permissions, subject, workspaceId });

const on = (plan: Plan): Option.Option<Plan> => Option.some(plan);

const resetsAt = DateTime.makeUnsafe("2026-12-01T00:00:00Z");

interface Held {
  readonly channels: readonly string[];
  readonly members: readonly string[];
  /** The channels of the account's other workspaces, counted with these. */
  readonly sharedChannels?: number;
  /** The owner who pays for the workspace, if not nobody. */
  readonly payer?: UserId;
}

// The use cases over a workspace on `plan` (none: a server that does not
// bill) holding `held`, with what the test did to it.
const run = <A, E>(
  plan: Option.Option<Plan>,
  held: Held,
  test: Effect.Effect<A, E, ReduceWorkspace | WorkspaceStanding>
) =>
  Effect.gen(function* withFakes() {
    const state = yield* Ref.make(held);
    const log = yield* Ref.make<readonly string[]>([]);

    const usage = Layer.succeed(
      WorkspaceUsage,
      WorkspaceUsage.of({
        heldIn: () => Effect.die("not read here"),
        of: () =>
          Ref.get(state).pipe(
            Effect.map(({ channels, members, sharedChannels = 0 }) => ({
              assistantRequests: { resetsAt, used: 0 },
              channels: channels.length + sharedChannels,
              mediaStorage: 0,
              members: members.length,
              scheduledPosts: { resetsAt, used: 7 },
            }))
          ),
      })
    );

    const holdings = Layer.succeed(
      WorkspaceHoldings,
      WorkspaceHoldings.of({
        channels: () =>
          Ref.get(state).pipe(Effect.map(({ channels }) => channels)),
        disconnect: (_actor, channelId) =>
          Ref.update(state, (now) => ({
            ...now,
            channels: now.channels.filter((id) => id !== channelId),
          })).pipe(
            Effect.andThen(
              Ref.update(log, (all) => [...all, `disconnect:${channelId}`])
            )
          ),
        keepMembers: (_actor, kept) =>
          kept.includes(userId)
            ? Ref.modify(state, (now) => [
                {
                  removed: now.members.filter((id) => !kept.includes(id))
                    .length,
                  revoked: 1,
                },
                {
                  ...now,
                  members: now.members.filter((id) => kept.includes(id)),
                },
              ]).pipe(
                Effect.tap(() =>
                  Ref.update(log, (all) => [...all, `keep:${kept.join(",")}`])
                )
              )
            : Effect.fail(new ReductionRefused({ reason: "selfRequired" })),
        present: () =>
          Ref.get(state).pipe(
            Effect.map(({ members }) => members.includes(userId))
          ),
      })
    );

    const entitlements = Option.match(plan, {
      onNone: () => UnmeteredTest,
      onSome: everyWorkspaceOn,
    });

    const result = yield* test.pipe(
      Effect.provide(
        ReduceWorkspace.layer.pipe(
          Layer.provideMerge(WorkspaceStanding.layer),
          Layer.provide(
            Layer.mergeAll(
              usage,
              holdings,
              entitlements,
              Layer.succeed(
                BillingMode,
                BillingMode.of({ enabled: Option.isSome(plan) })
              ),
              Layer.mock(BillingAccounts, {
                of: (id) =>
                  Effect.succeed(
                    aloneAccountOf(id, Option.fromUndefinedOr(held.payer))
                  ),
              }),
              Layer.mock(AccountPayers, {
                ownersOf: () =>
                  Ref.get(state).pipe(
                    Effect.map(({ members }) =>
                      members.flatMap((id) => Option.toArray(decodeUserId(id)))
                    )
                  ),
              })
            )
          )
        )
      )
    );

    return { log: yield* Ref.get(log), result, state: yield* Ref.get(state) };
  });

const afterTrial: Held = {
  channels: ["c1", "c2", "c3", "c4", "c5"],
  members: [userId, "m2", "m3"],
};

const standing = WorkspaceStanding.use((workspaces) =>
  workspaces.of(actorAs(permissionsFor("viewer")))
);

const reduce = (
  keep: {
    readonly channels: readonly string[];
    readonly members: readonly string[];
  },
  actor = actorAs()
) =>
  ReduceWorkspace.use((workspaces) =>
    workspaces.keep(actor, {
      keepChannelIds: keep.channels,
      keepMemberIds: keep.members,
    })
  );

describe("a workspace over its plan", () => {
  it.effect("says what it holds beyond the plan, to every member", () =>
    Effect.gen(function* over() {
      const { result } = yield* run(on("free"), afterTrial, standing);

      assert.deepStrictEqual(result, {
        mustReduce: true,
        over: [
          { allowed: 3, limit: "channels", used: 5 },
          { allowed: 2, limit: "members", used: 3 },
        ],
        plan: on("free"),
        planWithRoom: Option.some<PaidPlan>("starter"),
        scheduledPosts: 7,
      });
    })
  );

  it.effect(
    "is within its plan on a larger one, and wherever nothing bills",
    () =>
      Effect.gen(function* within() {
        const onPro = yield* run(on("pro"), afterTrial, standing);
        const unmetered = yield* run(Option.none(), afterTrial, standing);

        assert.deepStrictEqual(onPro.result, {
          mustReduce: false,
          over: [],
          plan: on("pro"),
          planWithRoom: Option.none(),
          scheduledPosts: 7,
        });
        assert.deepStrictEqual(unmetered.result, {
          mustReduce: false,
          over: [],
          plan: Option.none(),
          planWithRoom: Option.none(),
          scheduledPosts: 7,
        });
      })
  );

  it.effect("comes back within its plan by keeping what someone chose", () =>
    Effect.gen(function* chosen() {
      const { log, result, state } = yield* run(
        on("free"),
        afterTrial,
        reduce({ channels: ["c2", "c4", "c5"], members: [userId, "m3"] })
      );

      // Members first: a choice refused there disconnects nothing.
      assert.deepStrictEqual(log, [
        `keep:${userId},m3`,
        "disconnect:c1",
        "disconnect:c3",
      ]);
      assert.deepStrictEqual(state, {
        channels: ["c2", "c4", "c5"],
        members: [userId, "m3"],
      });
      assert.deepStrictEqual(result, {
        disconnectedChannels: 2,
        removedMembers: 1,
        revokedInvitations: 1,
        standing: {
          mustReduce: false,
          over: [],
          plan: on("free"),
          planWithRoom: Option.none(),
          scheduledPosts: 7,
        },
      });
    })
  );

  it.effect("touches only what is over the plan", () =>
    Effect.gen(function* onlyOver() {
      const { log, state } = yield* run(
        on("free"),
        { channels: ["c1", "c2", "c3", "c4"], members: [userId, "m2"] },
        // The members are within the plan: whatever is said of them, they
        // all stay.
        reduce({ channels: ["c1", "c2", "c3"], members: [userId] })
      );

      assert.deepStrictEqual(log, ["disconnect:c4"]);
      assert.deepStrictEqual(state.members, [userId, "m2"]);
    })
  );

  it.effect(
    "refuses the choice of someone another member's choice just removed, and changes nothing",
    () =>
      Effect.gen(function* removedMeanwhile() {
        // Two owners chose at once: the other's choice came first, the
        // members are back within the plan, and this one is no longer
        // among them, though the request was let in while they were.
        const { log, result, state } = yield* run(
          on("free"),
          { channels: ["c1", "c2", "c3", "c4"], members: ["m2"] },
          reduce({ channels: ["c1", "c2", "c3"], members: [userId] }).pipe(
            Effect.flip
          )
        );

        assert.deepStrictEqual(
          result,
          new ReductionRefused({ reason: "unknownMember" })
        );
        assert.deepStrictEqual(log, []);
        assert.deepStrictEqual(state.channels, ["c1", "c2", "c3", "c4"]);
      })
  );

  it.effect("refuses a choice the plan cannot hold, and changes nothing", () =>
    Effect.gen(function* refused() {
      const reasonOf = (
        keep: Parameters<typeof reduce>[0],
        actor = actorAs()
      ) =>
        run(
          on("free"),
          afterTrial,
          reduce(keep, actor).pipe(
            Effect.flip,
            Effect.map((failure) =>
              failure._tag === "ReductionRefused"
                ? failure.reason
                : failure._tag
            )
          )
        );

      const fit = { channels: ["c1", "c2", "c3"], members: [userId, "m2"] };

      const outcomes = yield* Effect.all({
        byAdminWithoutSelf: reasonOf({ ...fit, members: ["m2", "m3"] }),
        byEditor: reasonOf(fit, actorAs(permissionsFor("editor"))),
        byStaff: reasonOf(
          fit,
          actorAs(permissionsFor("owner"), {
            _tag: "user",
            impersonatedBy: Option.some(staffId),
            userId,
          })
        ),
        tooManyChannels: reasonOf({
          ...fit,
          channels: ["c1", "c2", "c3", "c4"],
        }),
        tooManyMembers: reasonOf({ ...fit, members: [userId, "m2", "m3"] }),
        unknownChannel: reasonOf({ ...fit, channels: ["c1", "c2", "c9"] }),
      });

      assert.deepStrictEqual(
        Object.fromEntries(
          Object.entries(outcomes).map(([name, { result }]) => [name, result])
        ),
        {
          byAdminWithoutSelf: "selfRequired",
          byEditor: "MissingPermission",
          byStaff: "PersonRequired",
          tooManyChannels: "tooManyChannels",
          tooManyMembers: "tooManyMembers",
          unknownChannel: "unknownChannel",
        }
      );

      for (const { log } of Object.values(outcomes)) {
        assert.deepStrictEqual(log, []);
      }
    })
  );

  it.effect(
    "counts a choice across its billing account, or lets it disconnect everything here",
    () =>
      Effect.gen(function* acrossTheAccount() {
        // Two of the free plan's three channels are here, two in another
        // workspace of the account.
        const shared: Held = {
          channels: ["c1", "c2"],
          members: [userId],
          sharedChannels: 2,
        };

        const kept = (channels: readonly string[]) =>
          run(on("free"), shared, reduce({ channels, members: [userId] }));

        const refused = yield* run(
          on("free"),
          shared,
          reduce({ channels: ["c1", "c2"], members: [userId] }).pipe(
            Effect.flip
          )
        );

        assert.deepStrictEqual(
          refused.result,
          new ReductionRefused({ reason: "tooManyChannels" })
        );
        assert.deepStrictEqual(refused.log, []);

        const within = yield* kept(["c1"]);

        assert.deepStrictEqual(within.log, ["disconnect:c2"]);
        assert.isFalse(within.result.standing.mustReduce);

        const nothingHere = yield* kept([]);

        assert.deepStrictEqual(nothingHere.log, [
          "disconnect:c1",
          "disconnect:c2",
        ]);
      })
  );

  it.effect("keeps the owner who pays for the workspace", () =>
    Effect.gen(function* payerStays() {
      const paidFor: Held = {
        ...afterTrial,
        members: [userId, "m2", payerId],
      };

      const refused = yield* run(
        on("free"),
        { ...paidFor, payer: payerId },
        reduce({ channels: ["c1", "c2", "c3"], members: [userId, "m2"] }).pipe(
          Effect.flip
        )
      );

      assert.deepStrictEqual(
        refused.result,
        new ReductionRefused({ reason: "payerRequired" })
      );
      assert.deepStrictEqual(refused.log, []);

      const kept = yield* run(
        on("free"),
        { ...paidFor, payer: payerId },
        reduce({ channels: ["c1", "c2", "c3"], members: [userId, payerId] })
      );

      assert.isFalse(kept.result.standing.mustReduce);
    })
  );

  it.effect("has nothing to reduce on a server that does not bill", () =>
    Effect.gen(function* off() {
      const { result } = yield* run(
        Option.none(),
        afterTrial,
        reduce({ channels: [], members: [userId] }).pipe(
          Effect.flip,
          Effect.map(({ _tag }) => _tag)
        )
      );

      assert.strictEqual(result, "BillingOff");
    })
  );
});
