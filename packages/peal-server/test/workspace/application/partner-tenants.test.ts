import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { CustomerWorkspaces } from "#workspace/application/customer-workspaces.ts";
import { MeterPartnerUsage } from "#workspace/application/meter-partner-usage.ts";
import { PartnerStore } from "#workspace/application/partner-store.ts";
import { PartnerTenants } from "#workspace/application/partner-tenants.ts";
import { PartnerWorkspaces } from "#workspace/application/partner-workspaces.ts";
import { WorkspaceChannelCounts } from "#workspace/application/workspace-channel-counts.ts";
import { CustomerWorkspace } from "#workspace/domain/customer-workspace.ts";
import { PartnerIdSchema } from "#workspace/domain/partner-id.ts";
import { Partner } from "#workspace/domain/partner.ts";

// What a partner holds, for billing's report of its usage per tenant, on
// fakes of the stores: who may read it, its home workspace first on the
// first page only, its days of the period; and the daily count's purge of
// the days past their 400.

const home = WorkspaceIdSchema.make("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d");

const otherHome = WorkspaceIdSchema.make(
  "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"
);

const partnerId = PartnerIdSchema.make("0190f3a0-0000-7000-8000-0000000000c1");

const createdAt = DateTime.makeUnsafe("2026-10-01T09:00:00Z");

const partner = new Partner({
  createdAt,
  id: partnerId,
  logoUrl: Option.none(),
  name: "Synthetic Suite",
  returnOrigins: [],
  updatedAt: createdAt,
  workspaceId: home,
});

const tenantId = (last: string): WorkspaceId =>
  WorkspaceIdSchema.make(`3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e${last}`);

// Three customers, newest first.
const tenants = ["03", "02", "01"].map(
  (last, index) =>
    new CustomerWorkspace({
      createdAt: DateTime.subtract(createdAt, { hours: index }),
      externalId: Option.some(`customer-${last}`),
      id: tenantId(last),
      name: `Customer ${last}`,
      partnerId,
    })
);

const channels = new Map<WorkspaceId, number>([
  [home, 2],
  [tenantId("03"), 1],
  [tenantId("01"), 4],
]);

const day = (written: string) => DateTime.makeUnsafe(`${written}T00:00:00Z`);

const days = [
  { channels: 6, day: "2026-11-02", workspaces: 3 },
  { channels: 7, day: "2026-11-03", workspaces: 3 },
];

// The days the store was asked for, and the day before which it purged.
const asked = Ref.makeUnsafe<readonly string[]>([]);

const purgedBefore = Ref.makeUnsafe<Option.Option<DateTime.Utc>>(Option.none());

const fail = (name: string) => () => Effect.die(`${name} is not used here`);

// How many times the channels were counted, and of which workspaces.
const counted = Ref.makeUnsafe<readonly (readonly WorkspaceId[])[]>([]);

// Whether the daily count fails, to see the purge run all the same.
const countFails = Ref.makeUnsafe(false);

const StoresTest = Layer.mergeAll(
  Layer.succeed(
    PartnerStore,
    PartnerStore.of({
      addKey: fail("addKey"),
      all: Ref.get(countFails).pipe(
        Effect.flatMap((fails) =>
          fails
            ? Effect.fail(new DatabaseError({ cause: "synthetic outage" }))
            : Effect.succeed([])
        )
      ),
      closeOf: fail("closeOf"),
      get: (id) =>
        Effect.succeed(id === partnerId ? Option.some(partner) : Option.none()),
      keyByDigest: fail("keyByDigest"),
      keys: fail("keys"),
      ofWorkspace: (id) =>
        Effect.succeed(id === home ? Option.some(partner) : Option.none()),
      open: fail("open"),
      purgeUsageBefore: (before) =>
        Ref.set(purgedBefore, Option.some(before)).pipe(Effect.as(4)),
      recordUsage: fail("recordUsage"),
      removeKey: fail("removeKey"),
      save: fail("save"),
      usage: fail("usage"),
      usageBetween: (_, from, to) =>
        Ref.set(asked, [
          DateTime.formatIsoDateUtc(from),
          DateTime.formatIsoDateUtc(to),
        ]).pipe(Effect.as(days)),
    })
  ),
  Layer.mock(CustomerWorkspaces, {
    idsOf: () => Effect.succeed(tenants.map(({ id }) => id)),
    list: (_, filter) =>
      Effect.succeed({
        total: tenants.length,
        workspaces: tenants
          .filter(
            (workspace) =>
              Option.isNone(filter.before) ||
              DateTime.isLessThan(
                workspace.createdAt,
                filter.before.value.createdAt
              )
          )
          .slice(0, filter.limit),
      }),
    nameOf: (id) =>
      Effect.succeed(
        id === home ? Option.some("Synthetic home") : Option.none()
      ),
    purgeKeys: () => Effect.succeed(0),
  }),
  Layer.succeed(
    WorkspaceChannelCounts,
    WorkspaceChannelCounts.of({
      of: (ids) =>
        Ref.update(counted, (all) => [...all, ids]).pipe(
          Effect.as(new Map([...channels].filter(([id]) => ids.includes(id))))
        ),
    })
  ),
  Layer.succeed(
    TransactionRunner,
    TransactionRunner.of({ transaction: (effect) => effect })
  )
);

const TenantsTest = Layer.mergeAll(
  PartnerTenants.layer,
  MeterPartnerUsage.layer
).pipe(Layer.provide(PartnerWorkspaces.layer), Layer.provideMerge(StoresTest));

const actorIn = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[]
) =>
  new Actor({
    permissions,
    subject: {
      _tag: "user",
      impersonatedBy: Option.none(),
      userId: UserIdSchema.make("4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a"),
    },
    workspaceId,
  });

const firstPage = { before: Option.none(), limit: Option.some(2) };

const key = { partnerId, scopes: ["workspaces:read"] };

describe(PartnerTenants, () => {
  it.effect(
    "opens the first page with the home workspace, then the customers' page",
    () =>
      Effect.gen(function* firstOne() {
        const found = yield* (yield* PartnerTenants).forKey(key, firstPage);

        assert.deepStrictEqual(
          found.page.tenants.map(
            ({
              externalId,
              home: isHome,
              name,
              workspaceId,
              channels: own,
            }) => ({
              channels: own,
              externalId: Option.getOrNull(externalId),
              home: isHome,
              name,
              workspaceId,
            })
          ),
          [
            {
              channels: 2,
              externalId: null,
              home: true,
              name: "Synthetic home",
              workspaceId: home,
            },
            {
              channels: 1,
              externalId: "customer-03",
              home: false,
              name: "Customer 03",
              workspaceId: tenantId("03"),
            },
            {
              channels: 0,
              externalId: "customer-02",
              home: false,
              name: "Customer 02",
              workspaceId: tenantId("02"),
            },
          ]
        );
        assert.strictEqual(found.page.total, 3);
        assert.isTrue(Option.isSome(found.page.next));
        // The account as a whole, on the first page, its channels counted
        // once for the page and the account.
        assert.deepStrictEqual(
          found.account,
          Option.some({
            held: { channels: 7, workspaces: 3 },
            workspaceIds: [home, ...tenants.map(({ id }) => id)],
          })
        );
        assert.deepStrictEqual(yield* Ref.get(counted), [
          [home, ...tenants.map(({ id }) => id)],
        ]);

        // The next page holds the last customer, no home workspace, and
        // nothing of the account: its channels counted alone.
        yield* Ref.set(counted, []);

        const next = yield* (yield* PartnerTenants).forKey(key, {
          ...firstPage,
          before: found.page.next,
        });

        assert.deepStrictEqual(
          next.page.tenants.map(({ channels: own, workspaceId }) => [
            workspaceId,
            own,
          ]),
          [[tenantId("01"), 4]]
        );
        assert.isTrue(Option.isNone(next.page.next));
        assert.isTrue(Option.isNone(next.account));
        assert.deepStrictEqual(yield* Ref.get(counted), [[tenantId("01")]]);

        // The account's days, once its tenancy is read.
        assert.deepStrictEqual(
          yield* (yield* PartnerTenants).daysOf(
            found.partnerId,
            day("2026-11-01"),
            day("2026-11-05")
          ),
          days
        );
        assert.deepStrictEqual(yield* Ref.get(asked), [
          "2026-11-01",
          "2026-11-05",
        ]);
      }).pipe(Effect.provide(TenantsTest))
  );

  it.effect(
    "answers the home workspace's people with partner:read the same",
    () =>
      Effect.gen(function* people() {
        const tenancy = yield* PartnerTenants;

        const found = yield* tenancy.forMember(
          actorIn(home, ["partner:read"]),
          firstPage
        );

        assert.strictEqual(found.homeWorkspaceId, home);
        assert.lengthOf(found.page.tenants, 3);

        const refused = yield* tenancy
          .forMember(actorIn(home, ["billing:read"]), firstPage)
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "MissingPermission");

        // A workspace that is no partner's home has no tenants to read.
        const elsewhere = yield* tenancy
          .forMember(actorIn(otherHome, ["partner:read"]), firstPage)
          .pipe(Effect.flip);

        assert.strictEqual(elsewhere._tag, "PartnerNotFound");
      }).pipe(Effect.provide(TenantsTest))
  );

  it.effect(
    "refuses a key without workspaces:read, and a partner that is gone",
    () =>
      Effect.gen(function* keys() {
        const tenancy = yield* PartnerTenants;

        const unscoped = yield* tenancy
          .forKey({ partnerId, scopes: ["workspaces:write"] }, firstPage)
          .pipe(Effect.flip);

        assert.deepInclude(unscoped, {
          _tag: "MissingPartnerScope",
          scope: "workspaces:read",
        });

        for (const gone of [
          "0190f3a0-0000-7000-8000-0000000000c9",
          "not-an-id",
        ]) {
          assert.deepInclude(
            yield* Effect.flip(
              tenancy.forKey(
                { partnerId: gone, scopes: ["workspaces:read"] },
                firstPage
              )
            ),
            { _tag: "PartnerNotFound" }
          );
        }
      }).pipe(Effect.provide(TenantsTest))
  );
});

describe(MeterPartnerUsage, () => {
  it.effect("deletes the partners' days older than 400 days", () =>
    Effect.gen(function* purges() {
      yield* TestClock.setTime(
        DateTime.toEpochMillis(DateTime.makeUnsafe("2026-11-12T23:41:00Z"))
      );

      const run = yield* (yield* MeterPartnerUsage).run;

      assert.deepStrictEqual(run, { days: 4, keys: 0, partners: 0 });

      // 2026-11-12 less 400 days: the 8th of October 2025 is the first
      // day kept.
      assert.deepStrictEqual(
        (yield* Ref.get(purgedBefore)).pipe(
          Option.map((before) => DateTime.formatIsoDateUtc(before))
        ),
        Option.some("2025-10-08")
      );
    }).pipe(Effect.provide(TenantsTest))
  );

  it.effect(
    "deletes the days past their time when the count fails, then fails",
    () =>
      Effect.gen(function* failing() {
        yield* TestClock.setTime(
          DateTime.toEpochMillis(DateTime.makeUnsafe("2026-11-13T23:41:00Z"))
        );
        yield* Ref.set(countFails, true);

        const failure = yield* (yield* MeterPartnerUsage).run.pipe(Effect.flip);

        assert.strictEqual(failure._tag, "DatabaseError");
        assert.deepStrictEqual(
          (yield* Ref.get(purgedBefore)).pipe(
            Option.map((before) => DateTime.formatIsoDateUtc(before))
          ),
          Option.some("2025-10-09")
        );

        yield* Ref.set(countFails, false);
      }).pipe(Effect.provide(TenantsTest))
  );
});
