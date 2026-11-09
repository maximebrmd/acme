import type { CalendarDay } from "acme-contract";

import { AcmeApi } from "#api/client.ts";

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
  AcmeApi.query("analytics", "summary", {
    params: { workspaceId },
    query: range,
    reactivityKeys: analyticsKeys,
  });

/** A post's counts on each of its channels, over time. */
export const postAnalytics = (workspaceId: string, postId: string) =>
  AcmeApi.query("analytics", "post", {
    params: { postId, workspaceId },
    reactivityKeys: analyticsKeys,
  });
