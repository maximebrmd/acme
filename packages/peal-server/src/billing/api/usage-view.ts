import { DateTime, Option } from "effect";
import type {
  MeteredPosts,
  PartnerUsageReport as PartnerUsageReportView,
  WorkspaceUsageReport as WorkspaceUsageReportView,
} from "peal-contract";

import type {
  PartnerUsageReport,
  WorkspaceUsageReport,
} from "#billing/application/usage-reports.ts";
import type { MeteredPostCount } from "#billing/domain/metered-posts.ts";

import { allowancesView } from "./billing-view.ts";

// What clients see of a workspace's usage, which the API and the MCP tools
// answer.

const dayOf = (instant: DateTime.Utc): string =>
  DateTime.formatIsoDateUtc(instant);

const meteredView = (counts: readonly MeteredPostCount[]): MeteredPosts[] =>
  counts.map((count) => ({
    month: dayOf(count.month),
    platform: count.platform,
    posts: count.posts,
    postsWithLinks: count.postsWithLinks,
  }));

/** What clients see of a workspace's usage over a period. */
export const usageView = ({
  current,
  entitlements,
  meteredPosts,
  period,
  report,
  sharedWith,
}: WorkspaceUsageReport): WorkspaceUsageReportView => ({
  allowances: entitlements.plan.pipe(
    Option.map(() =>
      allowancesView(entitlements.allowancesFor(current.channels))
    ),
    Option.getOrNull
  ),
  current,
  days: report.days.map((day) => ({
    assistantRequests: Option.getOrNull(day.assistantRequests),
    billableAccounts: Option.getOrNull(day.billableAccounts),
    byPlatform: day.byPlatform,
    channels: Option.getOrNull(day.channels),
    day: dayOf(day.day),
    mediaStorage: Option.getOrNull(day.mediaStorage),
    members: Option.getOrNull(day.members),
    publishedPosts: day.publishedPosts,
  })),
  period: { from: dayOf(period.from), to: dayOf(period.to) },
  plan: Option.getOrNull(entitlements.plan),
  sharedWith: sharedWith.pipe(
    Option.map((partnerWorkspaceId) => ({ partnerWorkspaceId })),
    Option.getOrNull
  ),
  totals: {
    ...report.totals,
    billableAccountDays: Option.getOrNull(report.totals.billableAccountDays),
    meteredPosts: meteredView(meteredPosts),
  },
});

/** What clients see of a partner's usage over a period, per workspace. */
export const partnerUsageView = ({
  account,
  entitlements,
  page,
  period,
}: PartnerUsageReport): PartnerUsageReportView => ({
  allowances: entitlements.plan.pipe(
    Option.map(() =>
      allowancesView(
        entitlements.allowancesFor(
          Option.match(account, {
            onNone: () => 0,
            onSome: ({ held }) => held.channels,
          })
        )
      )
    ),
    Option.getOrNull
  ),
  current: account.pipe(
    Option.map(({ held }) => held),
    Option.getOrNull
  ),
  days: account.pipe(
    Option.map(({ days }) =>
      days.map((day) => ({
        byPlatform: day.byPlatform,
        channels: Option.getOrNull(day.channels),
        day: dayOf(day.day),
        publishedPosts: day.publishedPosts,
        workspaces: Option.getOrNull(day.workspaces),
      }))
    ),
    Option.getOrNull
  ),
  period: { from: dayOf(period.from), to: dayOf(period.to) },
  plan: Option.getOrNull(entitlements.plan),
  totals: account.pipe(
    Option.map(({ meteredPosts, totals }) => ({
      ...totals,
      billableAccountDays: Option.getOrNull(totals.billableAccountDays),
      meteredPosts: meteredView(meteredPosts),
    })),
    Option.getOrNull
  ),
  workspaces: {
    next: Option.getOrNull(page.next),
    total: page.total,
    workspaces: page.tenants.map((used) => ({
      assistantRequests: used.assistantRequests,
      byPlatform: used.totals.byPlatform,
      channelDays: used.totals.channelDays,
      channels: used.tenant.channels,
      daysCounted: used.totals.daysCounted,
      externalId: Option.getOrNull(used.tenant.externalId),
      home: used.tenant.home,
      mediaStorage: Option.getOrNull(used.mediaStorage),
      meteredPosts: meteredView(used.meteredPosts),
      name: used.tenant.name,
      publishedPosts: used.totals.publishedPosts,
      workspaceId: used.tenant.workspaceId,
    })),
  },
});
