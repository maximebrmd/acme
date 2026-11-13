// The standing of a set of workspaces at once, on Postgres: of every
// shape a workspace can stand in, `overPlanIn` names exactly those whose
// own standing (`of`) says they must reduce, in a bounded number of
// statements whatever the number of workspaces. This equality is the
// specification of the set form.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { AssistantRequests } from "#assistant/application/assistant-requests.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanPools } from "#billing/application/ports/plan-pools.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { WorkspaceStanding } from "#billing/application/workspace-standing.ts";
import { ContextWorkspaceUsageLive } from "#billing/infrastructure/context-workspace-usage.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import { PartnerPlanHoldersLive } from "#billing/infrastructure/partner-plan-holders.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { SharedChannelAllowanceLive } from "#channels/infrastructure/plan-channel-allowance.ts";
import { MediaStorageUsage } from "#media/application/media-storage-usage.ts";
import { PostUsage } from "#publishing/application/post-usage.ts";
import { newId } from "#shared/application/ids.ts";
import { Actor } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  freshChannel,
  syntheticCredentials,
  TokenCipherTest,
} from "#test/channels/support.ts";
import { statementsOf } from "#test/shared/support.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";
import { PartnerOwnershipLive } from "#workspace/container.ts";
import { PartnerIdSchema } from "#workspace/domain/partner-id.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";
import { WorkspaceRosterLive } from "#workspace/infrastructure/drizzle-workspace-roster.ts";

const resetsAt = DateTime.makeUnsafe("2026-12-01T00:00:00Z");

// The bytes a workspace stores, by the workspace: more than the free
// plan's 500 MB for those named here. Storage never decides the standing,
// so it is given rather than uploaded.
const heavy = new Set<string>();

// Billing as the server runs it, with partners: the plan of a partner's
// home workspace, the channels counted across its pool, the members as
// the roster has them. The counts that never decide the standing (posts
// this month, the assistant's requests) are given.
const standingOn = (
  billing: boolean,
  graceUntil: Option.Option<DateTime.Utc> = Option.none()
) =>
  WorkspaceStanding.layer.pipe(
    Layer.provide(ContextWorkspaceUsageLive),
    Layer.provide(
      Layer.mergeAll(
        ChannelUsage.layer.pipe(Layer.provide(SharedChannelAllowanceLive)),
        WorkspaceSeats.layer.pipe(Layer.provide(WorkspaceRosterLive)),
        Layer.mock(PostUsage, {
          thisMonth: () => Effect.succeed({ resetsAt, scheduled: 0 }),
        }),
        Layer.mock(AssistantRequests, {
          today: () => Effect.succeed({ resetsAt, used: 0 }),
        }),
        Layer.mock(MediaStorageUsage, {
          stored: (workspaceId) =>
            Effect.succeed(heavy.has(workspaceId) ? 2_000_000_000 : 0),
          storedIn: (workspaceIds) =>
            Effect.succeed(
              new Map(
                workspaceIds
                  .filter((id) => heavy.has(id))
                  .map((id) => [id, 2_000_000_000] as const)
              )
            ),
        }),
        // Media's pool is the workspace alone here; channels' is counted
        // by the partner rule above.
        PlanPools.layerAlone
      )
    ),
    Layer.provideMerge(WorkspaceEntitlements.layerShared),
    Layer.provide(
      Layer.mergeAll(DrizzleSubscriptionsLive, PartnerPlanHoldersLive)
    ),
    Layer.provideMerge(DrizzleChannelRepository),
    Layer.provideMerge(PartnerOwnershipLive),
    Layer.provide(
      Layer.succeed(
        BillingMode,
        BillingMode.of({ enabled: billing, graceUntil })
      )
    ),
    Layer.provideMerge(TokenCipherTest),
    Layer.provideMerge(DatabaseTest)
  );

const at = DateTime.toDateUtc(DateTime.makeUnsafe("2026-11-01T00:00:00Z"));

const fresh = Effect.sync(() => WorkspaceIdSchema.make(randomUUID()));

interface Holding {
  readonly channels?: number;
  readonly members?: number;
  readonly subscription?: { readonly plan: string; readonly status: string };
  // More of them, as a workspace that subscribed several times has.
  readonly subscriptions?: readonly {
    readonly plan: string;
    readonly status: string;
  }[];
}

// A workspace with these channels, members and subscription, as each
// context keeps them.
const workspaceWith = Effect.fn("workspaceWith")(function* workspaceWith(
  held: Holding
) {
  const sql = yield* SqlClient.SqlClient;
  const repository = yield* ChannelRepository;
  const id = yield* fresh;

  yield* sql`INSERT INTO auth.organization (id, name, slug, created_at) VALUES (${id}, 'Synthetic standing', ${`standing-${id}`}, ${at})`;

  for (let index = 0; index < (held.members ?? 0); index += 1) {
    const userId = randomUUID();

    yield* sql`INSERT INTO auth.user (id, name, email, created_at, updated_at) VALUES (${userId}, 'Synthetic member', ${`${userId}@example.com`}, ${at}, ${at})`;
    yield* sql`INSERT INTO auth.member (organization_id, user_id, role, created_at) VALUES (${id}, ${userId}, 'member', ${at})`;
  }

  for (let index = 0; index < (held.channels ?? 0); index += 1) {
    const channel = yield* freshChannel(id);

    yield* repository.insert(channel, syntheticCredentials(channel));
  }

  const subscriptions = [
    ...(held.subscription === undefined ? [] : [held.subscription]),
    ...(held.subscriptions ?? []),
  ];

  for (const [index, { plan, status }] of subscriptions.entries()) {
    yield* sql`INSERT INTO billing.subscriptions (stripe_subscription_id, stripe_customer_id, workspace_id, plan, status, interval, cancel_at_period_end, last_event_at, last_event_id, updated_at) VALUES (${`sub_synthetic_${id}_${String(index)}`}, 'cus_synthetic', ${id}, ${plan}, ${status}, 'month', false, ${at}, ${`evt_synthetic_${id}_${String(index)}`}, ${at})`;
  }

  return id;
});

// A partner account of `home`, owning `owned`.
const partnerOf = Effect.fn("partnerOf")(function* partnerOf(
  home: WorkspaceId,
  owned: readonly WorkspaceId[]
) {
  const sql = yield* SqlClient.SqlClient;
  const id = yield* newId(PartnerIdSchema);

  yield* sql`INSERT INTO workspace.partners (id, workspace_id, name, return_origins, created_at, updated_at) VALUES (${id}, ${home}, 'Synthetic Suite', '{}', ${at}, ${at})`;

  if (owned.length > 0) {
    yield* sql`INSERT INTO workspace.partner_workspaces (workspace_id, partner_id, created_at)
      SELECT unnest(string_to_array(${owned.join(",")}, ',')::uuid[]), ${id}, ${at}`;
  }

  return id;
});

// Everything these workspaces left, partners included.
const cleanUp = (workspaceIds: readonly WorkspaceId[]) =>
  SqlClient.SqlClient.use((sql) => {
    const ids = workspaceIds.join(",");

    return Effect.all([
      sql`DELETE FROM workspace.partner_workspaces WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`,
      sql`DELETE FROM workspace.partners WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`,
      sql`DELETE FROM channels.channels WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`,
      sql`DELETE FROM billing.subscriptions WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`,
      sql`DELETE FROM auth.user WHERE id IN (SELECT user_id FROM auth.member WHERE organization_id = ANY(string_to_array(${ids}, ',')::uuid[]))`,
      sql`DELETE FROM auth.organization WHERE id = ANY(string_to_array(${ids}, ',')::uuid[])`,
    ]).pipe(Effect.orDie);
  });

const viewerOf = (workspaceId: WorkspaceId) =>
  new Actor({
    permissions: permissionsFor("viewer"),
    subject: {
      _tag: "user",
      impersonatedBy: Option.none(),
      userId: UserIdSchema.make("6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b9c"),
    },
    workspaceId,
  });

// The workspaces of `ids` whose own standing says they must reduce.
const mustReduceOneByOne = (ids: readonly WorkspaceId[]) =>
  WorkspaceStanding.use((standing) =>
    Effect.all(
      ids.map((workspaceId) =>
        standing
          .of(viewerOf(workspaceId))
          .pipe(
            Effect.map(({ mustReduce }) => [workspaceId, mustReduce] as const)
          )
      )
    )
  ).pipe(
    Effect.map(
      (pairs) => new Set(pairs.flatMap(([id, over]) => (over ? [id] : [])))
    )
  );

// One workspace of every shape, each named.
const everyStanding = Effect.gen(function* everyStanding() {
  const within = yield* workspaceWith({ channels: 2, members: 1 });
  const overChannels = yield* workspaceWith({ channels: 4, members: 1 });
  // Members never make the free tier over: only a legacy plan limits them.
  const manyMembers = yield* workspaceWith({ channels: 1, members: 3 });

  const overMembers = yield* workspaceWith({
    channels: 1,
    members: 4,
    subscription: { plan: "starter", status: "active" },
  });

  const overMediaOnly = yield* workspaceWith({ channels: 1, members: 1 });

  const trial = yield* workspaceWith({
    channels: 6,
    members: 4,
    subscription: { plan: "pro", status: "trialing" },
  });

  const paid = yield* workspaceWith({
    channels: 5,
    members: 3,
    subscription: { plan: "starter", status: "active" },
  });

  const cancelled = yield* workspaceWith({
    channels: 5,
    members: 1,
    subscription: { plan: "starter", status: "canceled" },
  });

  const unlisted = yield* workspaceWith({ channels: 5, members: 5 });

  // A pool on the free tier: 4 accounts across it, so no workspace is
  // over on its own channels, and the pool is over with the one customer
  // left out of the list.
  const home = yield* workspaceWith({ channels: 1, members: 1 });
  const customer = yield* workspaceWith({ channels: 1 });
  const quiet = yield* workspaceWith({});
  const outOfList = yield* workspaceWith({ channels: 2 });

  yield* partnerOf(home, [customer, quiet, outOfList]);

  // A pool on a paid plan, within it.
  const paidHome = yield* workspaceWith({
    channels: 4,
    members: 2,
    subscription: { plan: "business", status: "active" },
  });

  const paidCustomer = yield* workspaceWith({ channels: 8 });

  yield* partnerOf(paidHome, [paidCustomer]);

  // A partner's home workspace whose account owns nothing.
  const lonelyHome = yield* workspaceWith({ channels: 4 });

  yield* partnerOf(lonelyHome, []);

  // Every status a subscription can stand in: past due still gives its
  // plan; unpaid, paused and incomplete give none, and leave the free
  // plan.
  const pastDue = yield* workspaceWith({
    channels: 5,
    members: 1,
    subscription: { plan: "starter", status: "past_due" },
  });

  const unpaid = yield* workspaceWith({
    channels: 4,
    members: 1,
    subscription: { plan: "starter", status: "unpaid" },
  });

  const paused = yield* workspaceWith({
    channels: 4,
    members: 1,
    subscription: { plan: "starter", status: "paused" },
  });

  const incomplete = yield* workspaceWith({
    channels: 2,
    members: 1,
    subscription: { plan: "pro", status: "incomplete" },
  });

  // Two subscriptions: the one that gives a plan decides.
  const twice = yield* workspaceWith({
    channels: 5,
    members: 3,
    subscriptions: [
      { plan: "pro", status: "canceled" },
      { plan: "starter", status: "active" },
    ],
  });

  // A home on a legacy plan over on its own members while its pool's
  // channels fit, and its customer, which has no member, within.
  const crowdedHome = yield* workspaceWith({
    channels: 1,
    members: 4,
    subscription: { plan: "starter", status: "active" },
  });

  const crowdedCustomer = yield* workspaceWith({ channels: 1 });

  yield* partnerOf(crowdedHome, [crowdedCustomer]);

  heavy.add(overMediaOnly);

  const listed = [
    within,
    overChannels,
    overMembers,
    manyMembers,
    overMediaOnly,
    trial,
    paid,
    cancelled,
    home,
    customer,
    quiet,
    paidHome,
    paidCustomer,
    lonelyHome,
    pastDue,
    unpaid,
    paused,
    incomplete,
    twice,
    crowdedHome,
    crowdedCustomer,
    // Listed twice: answered once.
    within,
    overChannels,
  ];

  return {
    all: [...listed, unlisted, outOfList],
    expected: new Set([
      overChannels,
      overMembers,
      cancelled,
      home,
      customer,
      quiet,
      lonelyHome,
      unpaid,
      paused,
      crowdedHome,
    ]),
    listed,
  };
});

layer(standingOn(true))("the standing of several workspaces at once", (it) => {
  it.effect("names those whose own standing must reduce, of every shape", () =>
    Effect.gen(function* equal() {
      const standing = yield* WorkspaceStanding;
      const standings = yield* everyStanding;

      yield* Effect.gen(function* compared() {
        const oneByOne = yield* mustReduceOneByOne(standings.listed);
        const atOnce = yield* standing.overPlanIn(standings.listed);

        assert.deepStrictEqual(
          [...atOnce].toSorted(),
          [...oneByOne].toSorted()
        );
        // And what each shape is meant to be, so the equality is not
        // that of two empty sets.
        assert.deepStrictEqual(
          [...atOnce].toSorted(),
          [...standings.expected].toSorted()
        );
      }).pipe(Effect.ensuring(cleanUp(standings.all)));
    })
  );

  it.effect(
    "reads 50 workspaces in a few statements, a pool of 1,000 among them, and nothing for none",
    () =>
      Effect.gen(function* bounded() {
        const standing = yield* WorkspaceStanding;
        const sql = yield* SqlClient.SqlClient;

        const own = yield* Effect.all(
          Array.from({ length: 40 }, (_, index) =>
            workspaceWith({ channels: index % 5, members: 1 + (index % 3) })
          )
        );

        const home = yield* workspaceWith({ channels: 2, members: 1 });

        const customers = Array.from({ length: 1000 }, () =>
          WorkspaceIdSchema.make(randomUUID())
        );

        yield* partnerOf(home, customers);

        const listed = [...own, home, ...customers.slice(0, 9)];

        yield* Effect.gen(function* counted() {
          const { result, statements } = yield* statementsOf(
            standing.overPlanIn(listed)
          );

          assert.strictEqual(listed.length, 50);
          // The holders, their subscriptions, the pools (owners, homes,
          // their members), the channels and the members: one each.
          assert.strictEqual(statements, 7);
          assert.deepStrictEqual(
            [...result].toSorted(),
            [...(yield* mustReduceOneByOne(listed))].toSorted()
          );

          const none = yield* statementsOf(standing.overPlanIn([]));

          assert.strictEqual(none.statements, 0);
          assert.strictEqual(none.result.size, 0);
        }).pipe(
          Effect.ensuring(
            sql`DELETE FROM workspace.partner_workspaces WHERE workspace_id = ANY(string_to_array(${customers.join(",")}, ',')::uuid[])`.pipe(
              Effect.orDie,
              Effect.andThen(cleanUp([...own, home]))
            )
          )
        );
      })
  );
});

layer(standingOn(false))(
  "the standing of several workspaces on a server that does not bill",
  (it) => {
    it.effect("names none, and reads nothing", () =>
      Effect.gen(function* off() {
        const standing = yield* WorkspaceStanding;
        const over = yield* workspaceWith({ channels: 4, members: 3 });

        yield* Effect.gen(function* read() {
          const { result, statements } = yield* statementsOf(
            standing.overPlanIn([over])
          );

          assert.strictEqual(result.size, 0);
          assert.strictEqual(statements, 0);
          assert.strictEqual((yield* mustReduceOneByOne([over])).size, 0);
        }).pipe(Effect.ensuring(cleanUp([over])));
      })
    );
  }
);

// The tests' clock starts in 1970: the grace runs.
layer(
  standingOn(true, Option.some(DateTime.makeUnsafe("2027-01-31T00:00:00Z")))
)("the standing of several workspaces during the billing grace", (it) => {
  it.effect("names a legacy plan's over, never the free tier's", () =>
    Effect.gen(function* graced() {
      const overFree = yield* workspaceWith({ channels: 3, members: 1 });

      const overLegacy = yield* workspaceWith({
        channels: 6,
        members: 1,
        subscription: { plan: "starter", status: "active" },
      });

      yield* Effect.gen(function* compared() {
        const listed = [overFree, overLegacy];

        assert.deepStrictEqual(
          [...(yield* (yield* WorkspaceStanding).overPlanIn(listed))],
          [overLegacy]
        );
        assert.deepStrictEqual(
          [...(yield* mustReduceOneByOne(listed))],
          [overLegacy]
        );
      }).pipe(Effect.ensuring(cleanUp([overFree, overLegacy])));
    })
  );
});
