import { DateTime, Option } from "effect";
import type { WorkspaceUsageReport as WorkspaceUsageReportView } from "peal-contract";

import type { WorkspaceUsageReport } from "#billing/application/usage-reports.ts";

import { allowancesView } from "./billing-view.ts";

// What clients see of a workspace's usage, which the API and the MCP tools
// answer.

const dayOf = (instant: DateTime.Utc): string =>
  DateTime.formatIsoDateUtc(instant);

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
    Option.map(() => allowancesView(entitlements.allowances)),
    Option.getOrNull
  ),
  current,
  days: report.days.map((day) => ({
    assistantRequests: day.assistantRequests,
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
    meteredPosts: meteredPosts.map((count) => ({
      month: dayOf(count.month),
      platform: count.platform,
      posts: count.posts,
      postsWithLinks: count.postsWithLinks,
    })),
  },
});
