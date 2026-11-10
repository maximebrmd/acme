import type { CalendarDay, ExportKind } from "peal-contract";

import { PealApi } from "#api/client.ts";

// The analytics queries. Counts change only when the server reads them,
// every hour at most, so nothing here polls.

export const analyticsKeys = ["analytics"];

/** The days a summary covers, as days run in `timeZone`. */
export interface SummaryRange {
  readonly from: CalendarDay;
  readonly timeZone: string;
  readonly to: CalendarDay;
}

/** The workspace's posts published over the range, summed up. */
export const analyticsSummary = (workspaceId: string, range: SummaryRange) =>
  PealApi.query("analytics", "summary", {
    params: { workspaceId },
    query: range,
    reactivityKeys: analyticsKeys,
  });

/** A post's counts on each of its channels, over time. */
export const postAnalytics = (workspaceId: string, postId: string) =>
  PealApi.query("analytics", "post", {
    params: { postId, workspaceId },
    reactivityKeys: analyticsKeys,
  });

/**
 * What a post may hold on every platform, which says where this server
 * reads each post's counts. It changes with the server's settings only.
 */
export const platformCapabilities = (workspaceId: string) =>
  PealApi.query("capabilities", "platforms", { params: { workspaceId } });

/**
 * The workspace's analytics over the range beside the range before it,
 * with the accounts' followers.
 */
export const analyticsDashboard = (workspaceId: string, range: SummaryRange) =>
  PealApi.query("analytics", "dashboard", {
    params: { workspaceId },
    query: range,
    reactivityKeys: analyticsKeys,
  });

/** Where the browser downloads an export of the range from, as CSV. */
export const exportUrl = (
  workspaceId: string,
  kind: ExportKind,
  range: SummaryRange
): string =>
  `/api/workspaces/${encodeURIComponent(workspaceId)}/analytics/export?${new URLSearchParams(
    { ...range, format: "csv", kind }
  ).toString()}`;
