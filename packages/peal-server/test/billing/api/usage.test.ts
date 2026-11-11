import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Ref } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { TestClock } from "effect/testing";
import { Api } from "peal-contract";
import type { Member } from "peal-contract";

import { MeteredPostLedger } from "#billing/application/ports/metered-post-ledger.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { UsageLedger } from "#billing/application/ports/usage-ledger.ts";
import type { WorkspaceUsageRecord } from "#billing/application/ports/usage-ledger.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { RecordedUsage } from "#billing/application/recorded-usage.ts";
import { UsageReports } from "#billing/application/usage-reports.ts";
import { UsageApiLive } from "#billing/container.ts";
import type { Permission } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { everyWorkspaceOn, UnmeteredTest } from "#test/billing/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The usage endpoint on its use case, with the ledger in memory. Each
// request acts as a member, as the WorkspaceAccess middleware would.

const workspaceId = WorkspaceIdSchema.make(
  "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a81"
);

// A workspace a partner owns, on the plan of the partner's home.
const tenantId = WorkspaceIdSchema.make("6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b92");

const homeId = WorkspaceIdSchema.make("7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9ca3");

const now = DateTime.makeUnsafe("2026-11-11T15:00:00Z");

const day = (written: string) => DateTime.makeUnsafe(`${written}T00:00:00Z`);

const midnight = day("2026-11-12");

const current = {
  assistantRequests: { resetsAt: midnight, used: 4 },
  channels: 3,
  mediaStorage: 3_000_000_000,
  members: 2,
  scheduledPosts: {
    resetsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
    used: 9,
  },
};

// Whether two records count the same meter of a workspace on a day.
const same = (entry: WorkspaceUsageRecord) => (other: WorkspaceUsageRecord) =>
  other.workspaceId === entry.workspaceId &&
  other.record.meter === entry.record.meter &&
  other.record.dimension === entry.record.dimension &&
  DateTime.Equivalence(other.record.day, entry.record.day);

// Every workspace's ledger in memory.
const LedgerInMemory = Layer.effect(
  UsageLedger,
  Effect.gen(function* inMemory() {
    const kept = yield* Ref.make<readonly WorkspaceUsageRecord[]>([]);

    return UsageLedger.of({
      add: (entry) =>
        Ref.update(kept, (all) => {
          const found = all.find(same(entry));

          return [
            ...all.filter((other) => !same(entry)(other)),
            found === undefined
              ? entry
              : {
                  record: {
                    ...found.record,
                    quantity: found.record.quantity + entry.record.quantity,
                  },
                  workspaceId: entry.workspaceId,
                },
          ];
        }),
      allOf: () => Effect.succeed([]),
      eraseWorkspace: () => Effect.void,
      ofWorkspace: (id, period) =>
        Ref.get(kept).pipe(
          Effect.map((all) =>
            all
              .filter(
                ({ record, workspaceId: of }) =>
                  of === id &&
                  !DateTime.isLessThan(record.day, period.from) &&
                  !DateTime.isGreaterThan(record.day, period.to)
              )
              .map(({ record }) => record)
          )
        ),
      purgeBefore: () => Effect.succeed(0),
      set: (entries) =>
        Ref.update(kept, (all) => [
          ...all.filter(
            (other) => !entries.some((entry) => same(entry)(other))
          ),
          ...entries,
        ]),
    });
  })
);

const MeteredTest = Layer.mock(MeteredPostLedger, {
  ofWorkspace: () =>
    Effect.succeed([
      { month: day("2026-09-01"), platform: "x", posts: 4, postsWithLinks: 1 },
      { month: day("2026-10-01"), platform: "x", posts: 7, postsWithLinks: 2 },
      { month: day("2026-11-01"), platform: "x", posts: 2, postsWithLinks: 0 },
    ]),
});

const reportsOn = (entitlements: typeof UnmeteredTest) =>
  Layer.mergeAll(UsageReports.layer, RecordedUsage.layer).pipe(
    Layer.provideMerge(LedgerInMemory),
    Layer.provide(
      Layer.mergeAll(
        entitlements,
        MeteredTest,
        Layer.succeed(
          WorkspaceUsage,
          WorkspaceUsage.of({ of: () => Effect.succeed(current) })
        ),
        Layer.succeed(
          PlanHolders,
          PlanHolders.of({
            holderOf: (id) => Effect.succeed(id === tenantId ? homeId : id),
          })
        )
      )
    )
  );

const memberOf = (
  of: WorkspaceId,
  permissions: readonly Permission[]
): Member => ({
  permissions,
  principal: {
    _tag: "user",
    impersonatedBy: null,
    userId: "6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c",
  },
  workspaceId: of,
});

const as = (
  permissions: readonly Permission[],
  of: WorkspaceId = workspaceId
) =>
  HttpApiTest.groups(Api, ["usage"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        UsageApiLive.pipe(
          Layer.provideMerge(securityTest(memberOf(of, permissions)))
        ),
        HttpServer.layerServices
      )
    )
  );

const params = { workspaceId };

// What went out, each post on the UTC day it went out, and the days'
// states the snapshot wrote.
const seeded = Effect.gen(function* seeded() {
  const usage = yield* RecordedUsage;
  const ledger = yield* UsageLedger;

  yield* TestClock.setTime(DateTime.toEpochMillis(now));

  const wentOut = (platform: "bluesky" | "x", at: string) =>
    usage.postWentOut({
      platform,
      publishedAt: DateTime.makeUnsafe(at),
      workspaceId,
    });

  yield* wentOut("x", "2026-10-31T23:59:59.999Z");
  yield* wentOut("bluesky", "2026-11-01T00:00:00Z");
  yield* wentOut("bluesky", "2026-11-01T22:30:00Z");

  const state = (
    on: string,
    meter: "channels" | "mediaStorage" | "members",
    quantity: number
  ) => ({
    record: { day: day(on), dimension: "" as const, meter, quantity },
    workspaceId,
  });

  yield* ledger.set([
    state("2026-10-31", "channels", 2),
    state("2026-10-31", "members", 2),
    state("2026-10-31", "mediaStorage", 2_500_000_000),
    state("2026-11-01", "channels", 3),
    {
      record: {
        day: day("2026-11-01"),
        dimension: "",
        meter: "assistantRequests",
        quantity: 6,
      },
      workspaceId,
    },
  ]);
});

layer(reportsOn(everyWorkspaceOn("pro")))(
  "the usage endpoint on a server that bills",
  (it) => {
    it.effect(
      "answer a member with billing:read the plan, what is used now and each UTC day of the period",
      () =>
        Effect.gen(function* answers() {
          yield* seeded;

          const client = yield* as(permissionsFor("admin"));

          const report = yield* client.usage.get({
            params,
            query: { from: "2026-10-31", to: "2026-11-02" },
          });

          assert.strictEqual(report.plan, "pro");
          assert.strictEqual(report.allowances?.channels, 10);
          assert.isNull(report.sharedWith);
          assert.deepStrictEqual(report.current, current);
          assert.deepStrictEqual(report.period, {
            from: "2026-10-31",
            to: "2026-11-02",
          });
          assert.deepStrictEqual(report.days, [
            {
              assistantRequests: 0,
              byPlatform: [{ platform: "x", posts: 1 }],
              channels: 2,
              day: "2026-10-31",
              mediaStorage: 2_500_000_000,
              members: 2,
              publishedPosts: 1,
            },
            {
              assistantRequests: 6,
              byPlatform: [{ platform: "bluesky", posts: 2 }],
              channels: 3,
              day: "2026-11-01",
              mediaStorage: null,
              members: null,
              publishedPosts: 2,
            },
            {
              assistantRequests: 0,
              byPlatform: [],
              channels: null,
              day: "2026-11-02",
              mediaStorage: null,
              members: null,
              publishedPosts: 0,
            },
          ]);
          assert.deepStrictEqual(report.totals, {
            byPlatform: [
              { platform: "bluesky", posts: 2 },
              { platform: "x", posts: 1 },
            ],
            channelDays: 5,
            daysCounted: 2,
            // The months the period touches, whole.
            meteredPosts: [
              {
                month: "2026-10-01",
                platform: "x",
                posts: 7,
                postsWithLinks: 2,
              },
              {
                month: "2026-11-01",
                platform: "x",
                posts: 2,
                postsWithLinks: 0,
              },
            ],
            publishedPosts: 3,
          });
        })
    );

    it.effect("cover the last 30 days ending today when not told", () =>
      Effect.gen(function* defaults() {
        yield* TestClock.setTime(DateTime.toEpochMillis(now));

        const client = yield* as(permissionsFor("admin"));
        const report = yield* client.usage.get({ params, query: {} });

        assert.deepStrictEqual(report.period, {
          from: "2026-10-13",
          to: "2026-11-11",
        });
        assert.lengthOf(report.days, 30);
        assert.deepStrictEqual(
          (yield* client.usage.get({ params, query: { to: "2026-10-31" } }))
            .period,
          { from: "2026-10-02", to: "2026-10-31" }
        );
      })
    );

    it.effect(
      "refuse a range that ends before it starts or spans more than 92 days",
      () =>
        Effect.gen(function* refuses() {
          yield* TestClock.setTime(DateTime.toEpochMillis(now));

          const client = yield* as(permissionsFor("admin"));

          for (const query of [
            { from: "2026-11-02", to: "2026-11-01" },
            { from: "2026-07-31", to: "2026-10-31" },
            { from: "2026-11-12" },
          ]) {
            const refused = yield* client.usage
              .get({ params, query })
              .pipe(Effect.flip);

            assert.strictEqual(refused._tag, "InvalidDateRange");
          }

          // 92 days, both ends included, are taken.
          const longest = yield* client.usage.get({
            params,
            query: { from: "2026-08-01", to: "2026-10-31" },
          });

          assert.lengthOf(longest.days, 92);
        })
    );

    it.effect("refuse a member without billing:read", () =>
      Effect.gen(function* forbids() {
        const client = yield* as(permissionsFor("viewer"));

        const refused = yield* client.usage
          .get({ params, query: {} })
          .pipe(Effect.flip);

        assert.deepInclude(refused, {
          _tag: "Forbidden",
          permission: "billing:read",
        });
      })
    );

    it.effect(
      "say when a workspace's channels count against a partner's plan",
      () =>
        Effect.gen(function* shared() {
          yield* TestClock.setTime(DateTime.toEpochMillis(now));

          const client = yield* as(permissionsFor("admin"), tenantId);

          const report = yield* client.usage.get({
            params: { workspaceId: tenantId },
            query: {},
          });

          assert.deepStrictEqual(report.sharedWith, {
            partnerWorkspaceId: homeId,
          });
          assert.strictEqual(report.totals.publishedPosts, 0);
        })
    );
  }
);

layer(reportsOn(UnmeteredTest))(
  "the usage endpoint on a server that does not bill",
  (it) => {
    it.effect("answer the counts, without a plan", () =>
      Effect.gen(function* unbilled() {
        yield* seeded;

        const client = yield* as(permissionsFor("admin"));

        const report = yield* client.usage.get({
          params,
          query: { from: "2026-11-01", to: "2026-11-01" },
        });

        assert.isNull(report.plan);
        assert.isNull(report.allowances);
        assert.strictEqual(report.totals.publishedPosts, 2);
        assert.deepStrictEqual(report.current, current);
      })
    );
  }
);
