import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { Entitlements } from "#billing/domain/entitlements.ts";
import type { InvalidUsageRange } from "#billing/domain/invalid-usage-range.ts";
import type { MeteredPostCount } from "#billing/domain/metered-posts.ts";
import { reportOf, usagePeriodOf } from "#billing/domain/usage-meter.ts";
import type {
  PlatformPosts,
  UsagePeriod,
  UsageRecord,
  UsageReport,
  UsageTotals,
} from "#billing/domain/usage-meter.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { AccountDays } from "./account-days.ts";
import type { InvalidTenantCursor } from "./invalid-tenant-cursor.ts";
import type { NoPartnerAccount } from "./no-partner-account.ts";
import type { PartnerScopeMissing } from "./partner-scope-missing.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { MeteredPostLedger } from "./ports/metered-post-ledger.ts";
import type { WorkspaceMeteredPosts } from "./ports/metered-post-ledger.ts";
import { PartnerTenancy } from "./ports/partner-tenancy.ts";
import type {
  PartnerDay,
  PartnerKeyAsking,
  PartnerTenant,
  Tenancy,
} from "./ports/partner-tenancy.ts";
import { PlanHolders } from "./ports/plan-holders.ts";
import { UsageLedger } from "./ports/usage-ledger.ts";
import { WorkspaceUsage } from "./ports/workspace-usage.ts";
import type { Usage } from "./ports/workspace-usage.ts";
import { WorkspaceEntitlements } from "./workspace-entitlements.ts";

/** The days asked for, each a day's first instant (UTC), or none. */
export interface UsageRangeAsked {
  readonly from: Option.Option<DateTime.Utc>;
  readonly to: Option.Option<DateTime.Utc>;
}

/** A workspace's usage against its plan, now and over a period. */
export interface WorkspaceUsageReport {
  readonly current: Usage;
  /** Its plan; none on a server that does not bill. */
  readonly entitlements: Entitlements;
  /**
   * Its posts on platforms that bill the server per post, in each calendar
   * month the period touches, oldest first.
   */
  readonly meteredPosts: readonly MeteredPostCount[];
  readonly period: UsagePeriod;
  readonly report: UsageReport;
  /**
   * The workspace whose plan its channels count against, when not its own:
   * a partner's home workspace.
   */
  readonly sharedWith: Option.Option<WorkspaceId>;
}

/** The days and the page of a partner's report asked for. */
export interface PartnerUsageAsked extends UsageRangeAsked {
  readonly before: Option.Option<string>;
  readonly limit: Option.Option<number>;
}

/** What one workspace of a partner used over the period. */
export interface TenantUsageReport {
  /** The writing assistant's requests over the period's snapshots. */
  readonly assistantRequests: number;
  /** Bytes stored at the period's latest snapshot; none without one. */
  readonly mediaStorage: Option.Option<number>;
  readonly meteredPosts: readonly MeteredPostCount[];
  readonly tenant: PartnerTenant;
  readonly totals: UsageTotals;
}

/** A day (UTC) of a partner's usage, across the workspaces it holds. */
export interface PartnerUsageDay {
  readonly byPlatform: readonly PlatformPosts[];
  /** As the partner's daily count found them; none for a day without. */
  readonly channels: Option.Option<number>;
  readonly day: DateTime.Utc;
  readonly publishedPosts: number;
  readonly workspaces: Option.Option<number>;
}

/** What a partner account used as a whole, over the period. */
export interface PartnerAccountUsage {
  readonly days: readonly PartnerUsageDay[];
  readonly held: { readonly channels: number; readonly workspaces: number };
  /** Over every workspace that still exists, oldest month first. */
  readonly meteredPosts: readonly MeteredPostCount[];
  readonly totals: UsageTotals;
}

/**
 * What a partner account used across the workspaces it holds, against
 * its home workspace's plan, day by day and per workspace.
 */
export interface PartnerUsageReport {
  /**
   * The account as a whole, on the first page only: the pages after it
   * read their own workspaces alone.
   */
  readonly account: Option.Option<PartnerAccountUsage>;
  /** The home workspace's plan; none on a server that does not bill. */
  readonly entitlements: Entitlements;
  readonly page: {
    readonly next: Option.Option<string>;
    readonly tenants: readonly TenantUsageReport[];
    readonly total: number;
  };
  readonly period: UsagePeriod;
}

// The counts of many workspaces, by month and platform, added up, oldest
// month first.
const meteredSum = (
  counts: readonly WorkspaceMeteredPosts[]
): readonly MeteredPostCount[] => {
  const summed = new Map<string, MeteredPostCount>();

  for (const { count } of counts) {
    const key = `${DateTime.formatIso(count.month)} ${count.platform}`;
    const found = summed.get(key);

    summed.set(
      key,
      found === undefined
        ? count
        : {
            ...found,
            posts: found.posts + count.posts,
            postsWithLinks: found.postsWithLinks + count.postsWithLinks,
          }
    );
  }

  return [...summed.values()].toSorted(
    (left, right) =>
      DateTime.toEpochMillis(left.month) -
        DateTime.toEpochMillis(right.month) ||
      left.platform.localeCompare(right.platform)
  );
};

// What one workspace of the page used, from its records of the period.
const tenantReportOf = (
  tenant: PartnerTenant,
  records: readonly UsageRecord[],
  metered: readonly WorkspaceMeteredPosts[],
  period: UsagePeriod
): TenantUsageReport => {
  // The records and counts handed are this workspace's own.
  const { days, totals } = reportOf(records, period);

  const latestStorage = days
    .map(({ mediaStorage }) => mediaStorage)
    .findLast(Option.isSome);

  return {
    assistantRequests: days.reduce(
      (sum, { assistantRequests }) =>
        sum + Option.getOrElse(assistantRequests, () => 0),
      0
    ),
    mediaStorage: latestStorage ?? Option.none(),
    meteredPosts: meteredSum(metered),
    tenant,
    totals,
  };
};

/** A partner's days, and their totals. */
interface PartnerDays {
  readonly days: readonly PartnerUsageDay[];
  readonly totals: UsageTotals;
}

// The partner's days: its daily counts, and the posts of the workspaces
// that still exist; the totals' channel-days from those counts, and its
// billable account-days from the home's counted days.
const partnerDaysOf = (
  kept: readonly PartnerDay[],
  posts: UsageReport,
  billable: Option.Option<number>
) => {
  const counted = new Map(
    kept.map((day) => [DateTime.toEpochMillis(day.day), day])
  );

  const days = posts.days.map((day): PartnerUsageDay => {
    const count = Option.fromUndefinedOr(
      counted.get(DateTime.toEpochMillis(day.day))
    );

    return {
      byPlatform: day.byPlatform,
      channels: count.pipe(Option.map(({ channels }) => channels)),
      day: day.day,
      publishedPosts: day.publishedPosts,
      workspaces: count.pipe(Option.map(({ workspaces }) => workspaces)),
    };
  });

  const withCounts = days.flatMap(({ channels }) =>
    Option.isSome(channels) ? [channels.value] : []
  );

  const partnerDays: PartnerDays = {
    days,
    totals: {
      assistantImages: posts.totals.assistantImages,
      billableAccountDays: billable,
      byPlatform: posts.totals.byPlatform,
      channelDays: withCounts.reduce((sum, channels) => sum + channels, 0),
      daysCounted: withCounts.length,
      managedAds: posts.totals.managedAds,
      outboundMessages: posts.totals.outboundMessages,
      publishedPosts: posts.totals.publishedPosts,
    },
  };

  return partnerDays;
};

// Each workspace's entries, in one pass.
const byWorkspace = <A extends { readonly workspaceId: WorkspaceId }>(
  entries: readonly A[]
): ReadonlyMap<WorkspaceId, readonly A[]> => {
  const grouped = new Map<WorkspaceId, A[]>();

  for (const entry of entries) {
    const kept = grouped.get(entry.workspaceId);

    if (kept === undefined) {
      grouped.set(entry.workspaceId, [entry]);
    } else {
      kept.push(entry);
    }
  }

  return grouped;
};

// The months a metered count falls in that the period touches.
const touches = (period: UsagePeriod) => (count: MeteredPostCount) =>
  !DateTime.isLessThan(count.month, DateTime.startOf(period.from, "month")) &&
  !DateTime.isGreaterThan(count.month, period.to);

/**
 * What a workspace has used of its plan: what each limit counts now, then
 * day by day (UTC) over a period, from the usage ledger, with the posts on
 * platforms that bill per post. Counts only: nothing is priced. Needs
 * billing:read. On a server that does not bill it answers the same counts,
 * without a plan.
 */
export class UsageReports extends Context.Service<
  UsageReports,
  {
    readonly ofWorkspace: (
      actor: Actor,
      asked: UsageRangeAsked
    ) => Effect.Effect<
      WorkspaceUsageReport,
      DatabaseError | InvalidUsageRange | MissingPermission
    >;
    /**
     * What the partner account of the actor's workspace used, for its
     * people: needs partner:read.
     */
    readonly ofPartner: (
      actor: Actor,
      asked: PartnerUsageAsked
    ) => Effect.Effect<
      PartnerUsageReport,
      | DatabaseError
      | InvalidTenantCursor
      | InvalidUsageRange
      | MissingPermission
      | NoPartnerAccount
    >;
    /**
     * What the key's partner account used, for its backend: needs the
     * scope workspaces:read.
     */
    readonly ofPartnerKey: (
      key: PartnerKeyAsking,
      asked: PartnerUsageAsked
    ) => Effect.Effect<
      PartnerUsageReport,
      | DatabaseError
      | InvalidTenantCursor
      | InvalidUsageRange
      | NoPartnerAccount
      | PartnerScopeMissing
    >;
  }
>()("peal-server/billing/application/UsageReports") {
  static readonly layer = Layer.effect(
    UsageReports,
    Effect.gen(function* UsageReportsLive() {
      const entitlements = yield* WorkspaceEntitlements;
      const usage = yield* WorkspaceUsage;
      const ledger = yield* UsageLedger;
      const metered = yield* MeteredPostLedger;
      const holders = yield* PlanHolders;
      const tenancies = yield* PartnerTenancy;
      const accountDays = yield* AccountDays;
      const { enabled: bills } = yield* BillingMode;

      const ofWorkspace = Effect.fn("UsageReports.ofWorkspace")(
        function* ofWorkspace(actor: Actor, asked: UsageRangeAsked) {
          yield* Effect.fromResult(authorize(actor, "billing:read"));

          const period = yield* Effect.fromResult(
            usagePeriodOf(asked, yield* DateTime.now)
          );

          const { workspaceId } = actor;

          const found = yield* Effect.all(
            {
              counted: metered.ofWorkspace(workspaceId),
              current: usage.of(workspaceId),
              entitled: entitlements.of(workspaceId),
              holder: holders.holderOf(workspaceId),
              records: ledger.ofWorkspace(workspaceId, period),
            },
            { concurrency: "unbounded" }
          );

          // The billing account's days, kept on its billing workspace, on
          // a server that bills.
          const days =
            Option.isSome(found.entitled.plan) && found.holder === workspaceId
              ? yield* accountDays.ofDays([workspaceId], period)
              : [];

          const report: WorkspaceUsageReport = {
            current: found.current,
            entitlements: found.entitled,
            meteredPosts: found.counted.filter(touches(period)),
            period,
            report: reportOf(found.records, period, days),
            sharedWith:
              found.holder === workspaceId
                ? Option.none()
                : Option.some(found.holder),
          };

          return report;
        }
      );

      // The account as a whole, for the first page: the posts of every
      // workspace it holds, their metered posts, and its daily counts.
      const accountOf = Effect.fn("UsageReports.accountOf")(function* accountOf(
        tenancy: Tenancy,
        account: {
          readonly held: PartnerAccountUsage["held"];
          readonly workspaceIds: readonly WorkspaceId[];
        },
        period: UsagePeriod
      ) {
        const found = yield* Effect.all(
          {
            counted: bills
              ? accountDays.ofDays([tenancy.homeWorkspaceId], period)
              : Effect.succeed([]),
            days: tenancies.daysOf(tenancy.partnerId, period),
            metered: metered.ofWorkspaces(account.workspaceIds, period),
            posts: ledger.postsAcross(account.workspaceIds, period),
          },
          { concurrency: "unbounded" }
        );

        const { days, totals } = partnerDaysOf(
          found.days,
          reportOf(found.posts, period),
          reportOf([], period, found.counted).totals.billableAccountDays
        );

        const whole: PartnerAccountUsage = {
          days,
          held: account.held,
          meteredPosts: meteredSum(found.metered),
          totals,
        };

        return { metered: found.metered, whole };
      });

      // The report of what the workspace context says the partner holds,
      // once it said the caller may read it: the page's records in one
      // read, and on the first page the account as a whole.
      const partnerReport = Effect.fn("UsageReports.partnerReport")(
        function* partnerReport<E>(
          asked: PartnerUsageAsked,
          tenancyOf: Effect.Effect<Tenancy, E>
        ) {
          const tenancy = yield* tenancyOf;

          const period = yield* Effect.fromResult(
            usagePeriodOf(asked, yield* DateTime.now)
          );

          const pageIds = tenancy.page.tenants.map(
            ({ workspaceId }) => workspaceId
          );

          const found = yield* Effect.all(
            {
              account: Effect.transposeOption(
                tenancy.account.pipe(
                  Option.map((account) => accountOf(tenancy, account, period))
                )
              ),
              entitled: entitlements.of(tenancy.homeWorkspaceId),
              page: ledger.ofWorkspaces(pageIds, period),
            },
            { concurrency: "unbounded" }
          );

          // The page's metered posts come with the account's on the first
          // page; a later page reads its own.
          const meteredOfPage = Option.isSome(found.account)
            ? found.account.value.metered
            : yield* metered.ofWorkspaces(pageIds, period);

          const records = byWorkspace(found.page);
          const counts = byWorkspace(meteredOfPage);

          const report: PartnerUsageReport = {
            account: found.account.pipe(Option.map(({ whole }) => whole)),
            entitlements: found.entitled,
            page: {
              next: tenancy.page.next,
              tenants: tenancy.page.tenants.map((tenant) =>
                tenantReportOf(
                  tenant,
                  (records.get(tenant.workspaceId) ?? []).map(
                    ({ record }) => record
                  ),
                  counts.get(tenant.workspaceId) ?? [],
                  period
                )
              ),
              total: tenancy.page.total,
            },
            period,
          };

          return report;
        }
      );

      // Who asks is checked first: a range out of bounds is told only to
      // whoever may read the report.
      const ofPartner = (actor: Actor, asked: PartnerUsageAsked) =>
        partnerReport(
          asked,
          tenancies.forMember(actor, {
            before: asked.before,
            limit: asked.limit,
          })
        ).pipe(Effect.withSpan("UsageReports.ofPartner"));

      const ofPartnerKey = (key: PartnerKeyAsking, asked: PartnerUsageAsked) =>
        partnerReport(
          asked,
          tenancies.forKey(key, { before: asked.before, limit: asked.limit })
        ).pipe(Effect.withSpan("UsageReports.ofPartnerKey"));

      return UsageReports.of({ ofPartner, ofPartnerKey, ofWorkspace });
    })
  );
}
