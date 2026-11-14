import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { TestClock } from "effect/testing";
import { Api } from "peal-contract";
import type { Member, Principal } from "peal-contract";

import { InvalidTenantCursor } from "#billing/application/invalid-tenant-cursor.ts";
import { NoPartnerAccount } from "#billing/application/no-partner-account.ts";
import { PartnerScopeMissing } from "#billing/application/partner-scope-missing.ts";
import { MeteredPostLedger } from "#billing/application/ports/metered-post-ledger.ts";
import type { WorkspaceMeteredPosts } from "#billing/application/ports/metered-post-ledger.ts";
import { PartnerTenancy } from "#billing/application/ports/partner-tenancy.ts";
import type {
  PartnerTenant,
  Tenancy,
  TenancyAsked,
} from "#billing/application/ports/partner-tenancy.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { UsageLedger } from "#billing/application/ports/usage-ledger.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { UsageReports } from "#billing/application/usage-reports.ts";
import { PartnerUsageApiLive, UsageApiLive } from "#billing/container.ts";
import type { UsageRecord } from "#billing/domain/usage-meter.ts";
import type { Permission } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  everyWorkspaceOn,
  UnmeteredTest,
  UsageLedgerInMemory,
  AccountDaysUncountedTest,
} from "#test/billing/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// A partner's usage per customer, on its use case with the ledgers in
// memory and the workspaces the partner holds as the workspace context
// would answer them: a home workspace and two customers, and a stranger
// whose counts never come in.

const home = WorkspaceIdSchema.make("1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e");

const first = WorkspaceIdSchema.make("2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f");

const second = WorkspaceIdSchema.make("3d4e5f6a-7b8c-4d9e-8f1a-2b3c4d5e6f7a");

const stranger = WorkspaceIdSchema.make("4e5f6a7b-8c9d-4e0f-9a1b-2c3d4e5f6a7b");

// A workspace that is no partner's home.
const ordinary = WorkspaceIdSchema.make("5f6a7b8c-9d0e-4f1a-8b2c-3d4e5f6a7b8c");

const partnerId = "0190f3a0-0000-7000-8000-0000000000d1";

const now = DateTime.makeUnsafe("2026-11-11T15:00:00Z");

const day = (written: string) => DateTime.makeUnsafe(`${written}T00:00:00Z`);

const tenant = (
  workspaceId: WorkspaceId,
  name: string,
  channels: number,
  externalId?: string
): PartnerTenant => ({
  channels,
  externalId: Option.fromUndefinedOr(externalId),
  home: workspaceId === home,
  name,
  workspaceId,
});

// The next page's cursor, as the workspace context writes it; any other
// is refused.
const cursor = "c3ludGhldGljLWN1cnNvcg";

const tenancyOf = ({ before }: TenancyAsked): Tenancy =>
  Option.isNone(before)
    ? {
        account: Option.some({
          held: { channels: 6, workspaces: 2 },
          workspaceIds: [home, first, second],
        }),
        homeWorkspaceId: home,
        page: {
          next: Option.some(cursor),
          tenants: [
            tenant(home, "Synthetic home", 2),
            tenant(first, "First customer", 3, "customer-1"),
          ],
          total: 2,
        },
        partnerId,
      }
    : {
        account: Option.none(),
        homeWorkspaceId: home,
        page: {
          next: Option.none(),
          tenants: [tenant(second, "Second customer", 1)],
          total: 2,
        },
        partnerId,
      };

const TenancyTest = Layer.succeed(
  PartnerTenancy,
  PartnerTenancy.of({
    daysOf: (id) =>
      Effect.succeed(
        id === partnerId
          ? [
              { channels: 5, day: day("2026-10-31"), workspaces: 3 },
              { channels: 6, day: day("2026-11-01"), workspaces: 2 },
            ]
          : []
      ),
    forKey: (key, asked) => {
      if (!key.scopes.includes("workspaces:read")) {
        return Effect.fail(
          new PartnerScopeMissing({ scope: "workspaces:read" })
        );
      }

      if (key.partnerId !== partnerId) {
        return Effect.fail(new NoPartnerAccount());
      }

      return Option.exists(asked.before, (before) => before !== cursor)
        ? Effect.fail(new InvalidTenantCursor())
        : Effect.succeed(tenancyOf(asked));
    },
    forMember: (actor, asked) =>
      Effect.fromResult(authorize(actor, "partner:read")).pipe(
        Effect.andThen(
          actor.workspaceId === home
            ? Effect.succeed(tenancyOf(asked))
            : Effect.fail(new NoPartnerAccount())
        )
      ),
  })
);

// Two months of X posts in the first customer, one in the stranger.
const metered: readonly WorkspaceMeteredPosts[] = [
  {
    count: {
      month: day("2026-10-01"),
      platform: "x",
      posts: 4,
      postsWithLinks: 1,
    },
    workspaceId: first,
  },
  {
    count: {
      month: day("2026-11-01"),
      platform: "x",
      posts: 2,
      postsWithLinks: 0,
    },
    workspaceId: first,
  },
  {
    count: {
      month: day("2026-11-01"),
      platform: "x",
      posts: 1,
      postsWithLinks: 1,
    },
    workspaceId: home,
  },
  {
    count: {
      month: day("2026-11-01"),
      platform: "x",
      posts: 9,
      postsWithLinks: 9,
    },
    workspaceId: stranger,
  },
];

const MeteredTest = Layer.mock(MeteredPostLedger, {
  ofWorkspaces: (ids) =>
    Effect.succeed(
      metered.filter(({ workspaceId }) => ids.includes(workspaceId))
    ),
});

const reportsOn = (entitlements: typeof UnmeteredTest) =>
  UsageReports.layer.pipe(
    Layer.provideMerge(UsageLedgerInMemory),
    Layer.provide(
      Layer.mergeAll(
        entitlements,
        MeteredTest,
        TenancyTest,
        Layer.mock(WorkspaceUsage, {}),
        PlanHolders.layerOwn,
        AccountDaysUncountedTest
      )
    )
  );

// The two copies of the report, served as the members or the key reach
// them.
const as = (member: Member) =>
  HttpApiTest.groups(Api, ["usage", "partnerUsage"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        Layer.mergeAll(UsageApiLive, PartnerUsageApiLive).pipe(
          Layer.provideMerge(securityTest(member))
        ),
        HttpServer.layerServices
      )
    )
  );

const asMember = (
  permissions: readonly Permission[],
  workspaceId: WorkspaceId = home
) =>
  as({
    permissions,
    principal: {
      _tag: "user",
      impersonatedBy: null,
      userId: "6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c",
    },
    workspaceId,
  });

const partnerKey = (scopes: readonly string[]): Principal => ({
  _tag: "partnerKey",
  partnerId,
  partnerKeyId: "0190f3a0-0000-7000-8000-0000000000d2",
  permissions: ["post:read"],
  scopes: scopes.filter(
    (scope): scope is "workspaces:read" | "workspaces:write" =>
      scope === "workspaces:read" || scope === "workspaces:write"
  ),
});

// The partner API is reached with no workspace: what WorkspaceAccess
// would provide is never read there.
const asPrincipal = (principal: Principal) =>
  as({ permissions: [], principal, workspaceId: home });

const record = (
  workspaceId: WorkspaceId,
  on: string,
  meter: UsageRecord["meter"],
  quantity: number,
  platform?: "bluesky" | "x"
) => ({
  record:
    meter === "publishedPosts"
      ? {
          day: day(on),
          dimension: platform ?? "x",
          meter,
          quantity,
        }
      : { day: day(on), dimension: "" as const, meter, quantity },
  workspaceId,
});

const seeded = Effect.gen(function* seeded() {
  const ledger = yield* UsageLedger;

  yield* TestClock.setTime(DateTime.toEpochMillis(now));

  yield* ledger.set([
    record(home, "2026-10-31", "channels", 2),
    record(home, "2026-11-01", "channels", 2),
    record(first, "2026-10-31", "channels", 3),
    record(first, "2026-11-01", "channels", 3),
    record(first, "2026-10-31", "mediaStorage", 1000),
    record(first, "2026-11-01", "mediaStorage", 1500),
    record(first, "2026-10-31", "assistantRequests", 2),
    record(first, "2026-11-01", "assistantRequests", 5),
    record(second, "2026-11-01", "channels", 1),
    record(stranger, "2026-11-01", "channels", 40),
  ]);

  for (const added of [
    record(home, "2026-11-01", "publishedPosts", 1, "bluesky"),
    record(first, "2026-10-31", "publishedPosts", 2),
    record(first, "2026-11-01", "publishedPosts", 1, "bluesky"),
    record(second, "2026-11-01", "publishedPosts", 4),
    record(stranger, "2026-11-01", "publishedPosts", 30),
  ]) {
    yield* ledger.add(added);
  }
});

const query = { from: "2026-10-31", to: "2026-11-01" } as const;

layer(reportsOn(everyWorkspaceOn("agency")))(
  "a partner's usage per customer on a server that bills",
  (it) => {
    it.effect(
      "answers the home workspace's people its days, its totals and a page of its workspaces, the home first",
      () =>
        Effect.gen(function* answers() {
          yield* seeded;

          const client = yield* asMember(permissionsFor("admin"));

          const report = yield* client.usage.partner({
            params: { workspaceId: home },
            query,
          });

          assert.strictEqual(report.plan, "agency");
          assert.isNotNull(report.allowances);
          assert.deepStrictEqual(report.current, {
            channels: 6,
            workspaces: 2,
          });
          assert.deepStrictEqual(report.period, query);
          assert.deepStrictEqual(report.days, [
            {
              byPlatform: [{ platform: "x", posts: 2 }],
              channels: 5,
              day: "2026-10-31",
              publishedPosts: 2,
              workspaces: 3,
            },
            {
              byPlatform: [
                { platform: "bluesky", posts: 2 },
                { platform: "x", posts: 4 },
              ],
              channels: 6,
              day: "2026-11-01",
              publishedPosts: 6,
              workspaces: 2,
            },
          ]);
          // The stranger's counts are in none of the sums.
          assert.deepStrictEqual(report.totals, {
            assistantImages: 0,
            billableAccountDays: null,
            byPlatform: [
              { platform: "bluesky", posts: 2 },
              { platform: "x", posts: 6 },
            ],
            channelDays: 11,
            daysCounted: 2,
            managedAds: 0,
            meteredPosts: [
              {
                month: "2026-10-01",
                platform: "x",
                posts: 4,
                postsWithLinks: 1,
              },
              {
                month: "2026-11-01",
                platform: "x",
                posts: 3,
                postsWithLinks: 1,
              },
            ],
            outboundMessages: 0,
            publishedPosts: 8,
          });
          assert.deepStrictEqual(report.workspaces, {
            next: cursor,
            total: 2,
            workspaces: [
              {
                assistantImages: 0,
                assistantRequests: 0,
                byPlatform: [{ platform: "bluesky", posts: 1 }],
                channelDays: 4,
                channels: 2,
                daysCounted: 2,
                externalId: null,
                home: true,
                managedAds: 0,
                mediaStorage: null,
                meteredPosts: [
                  {
                    month: "2026-11-01",
                    platform: "x",
                    posts: 1,
                    postsWithLinks: 1,
                  },
                ],
                name: "Synthetic home",
                outboundMessages: 0,
                publishedPosts: 1,
                workspaceId: home,
              },
              {
                assistantImages: 0,
                assistantRequests: 7,
                byPlatform: [
                  { platform: "bluesky", posts: 1 },
                  { platform: "x", posts: 2 },
                ],
                channelDays: 6,
                channels: 3,
                daysCounted: 2,
                externalId: "customer-1",
                home: false,
                managedAds: 0,
                mediaStorage: 1500,
                meteredPosts: [
                  {
                    month: "2026-10-01",
                    platform: "x",
                    posts: 4,
                    postsWithLinks: 1,
                  },
                  {
                    month: "2026-11-01",
                    platform: "x",
                    posts: 2,
                    postsWithLinks: 0,
                  },
                ],
                name: "First customer",
                outboundMessages: 0,
                publishedPosts: 3,
                workspaceId: first,
              },
            ],
          });

          // The next page, for the key, holds the second customer only.
          const keyed = yield* asPrincipal(partnerKey(["workspaces:read"]));

          const next = yield* keyed.partnerUsage.get({
            query: { ...query, before: cursor },
          });

          assert.deepStrictEqual(
            next.workspaces.workspaces.map(({ workspaceId, home: isHome }) => ({
              home: isHome,
              workspaceId,
            })),
            [{ home: false, workspaceId: second }]
          );
          assert.isNull(next.workspaces.next);
          // The account as a whole comes with the first page only.
          assert.deepStrictEqual(
            [next.current, next.days, next.totals],
            [null, null, null]
          );
          assert.deepStrictEqual(
            next.workspaces.workspaces[0]?.publishedPosts,
            4
          );
        })
    );

    it.effect(
      "refuses a member without partner:read, and a workspace with no partner account",
      () =>
        Effect.gen(function* refuses() {
          const editor = yield* asMember(permissionsFor("editor"));

          const refused = yield* editor.usage
            .partner({ params: { workspaceId: home }, query })
            .pipe(Effect.flip);

          assert.deepInclude(refused, {
            _tag: "Forbidden",
            permission: "partner:read",
            reason: "missingPermission",
          });

          const elsewhere = yield* asMember(permissionsFor("owner"), ordinary);

          const none = yield* elsewhere.usage
            .partner({ params: { workspaceId: ordinary }, query })
            .pipe(Effect.flip);

          assert.strictEqual(none._tag, "PartnerNotFound");
        })
    );

    it.effect(
      "takes a partner key with workspaces:read alone, in the partner API's words",
      () =>
        Effect.gen(function* keys() {
          const unscoped = yield* asPrincipal(partnerKey(["workspaces:write"]));

          const missing = yield* unscoped.partnerUsage
            .get({ query })
            .pipe(Effect.flip);

          assert.deepInclude(missing, {
            _tag: "Forbidden",
            message:
              "This partner key was not given the scope workspaces:read, which this request takes. An owner or an admin of the partner's workspace creates a key that has it.",
            reason: "missingScope",
            scope: "workspaces:read",
          });

          // A member's session and a workspace's key never call it.
          for (const principal of [
            {
              _tag: "user",
              impersonatedBy: null,
              userId: "6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c",
            },
            {
              _tag: "apiKey",
              apiKeyId: "synthetic-key",
              permissions: ["partner:read"],
              workspaceId: home,
            },
          ] satisfies readonly Principal[]) {
            const client = yield* asPrincipal(principal);

            const refused = yield* client.partnerUsage
              .get({ query })
              .pipe(Effect.flip);

            assert.deepInclude(refused, {
              _tag: "Forbidden",
              message:
                "The partner API takes a partner key, sent as a bearer token: not a session, a workspace's API key or an application's token.",
            });
          }
        })
    );

    it.effect(
      "tells a range out of bounds only to whoever may read the report",
      () =>
        Effect.gen(function* firstWho() {
          yield* TestClock.setTime(DateTime.toEpochMillis(now));

          const tooLong = { from: "2026-01-01", to: "2026-11-01" } as const;
          const editor = yield* asMember(permissionsFor("editor"));

          const refused = yield* editor.usage
            .partner({ params: { workspaceId: home }, query: tooLong })
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "Forbidden");

          const unscoped = yield* asPrincipal(partnerKey(["workspaces:write"]));

          const missing = yield* unscoped.partnerUsage
            .get({ query: tooLong })
            .pipe(Effect.flip);

          assert.deepInclude(missing, { reason: "missingScope" });
        })
    );

    it.effect("refuses a cursor it did not write, and too long a period", () =>
      Effect.gen(function* invalid() {
        yield* TestClock.setTime(DateTime.toEpochMillis(now));

        const client = yield* asPrincipal(partnerKey(["workspaces:read"]));

        const cursorRefused = yield* client.partnerUsage
          .get({ query: { ...query, before: "elsewhere" } })
          .pipe(Effect.flip);

        assert.strictEqual(cursorRefused._tag, "BadRequest");

        const rangeRefused = yield* client.partnerUsage
          .get({ query: { from: "2026-01-01", to: "2026-11-01" } })
          .pipe(Effect.flip);

        assert.strictEqual(rangeRefused._tag, "InvalidDateRange");
      })
    );
  }
);

layer(reportsOn(UnmeteredTest))(
  "a partner's usage per customer on a server that does not bill",
  (it) => {
    it.effect("answers the same counts, without a plan", () =>
      Effect.gen(function* unmetered() {
        yield* TestClock.setTime(DateTime.toEpochMillis(now));

        const client = yield* asPrincipal(partnerKey(["workspaces:read"]));
        const report = yield* client.partnerUsage.get({ query });

        assert.isNull(report.plan);
        assert.isNull(report.allowances);
        assert.deepStrictEqual(report.current, { channels: 6, workspaces: 2 });
      })
    );
  }
);
