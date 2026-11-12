import type { DashboardTotals, WorkspaceAnalytics } from "peal-contract";

import { trendOf } from "#analytics/report.ts";
import type { Trend } from "#analytics/report.ts";

/** The figures the report shows, in its columns' order. */
export const reportMetrics = [
  "posts",
  "engagement",
  "likes",
  "reposts",
  "replies",
  "quotes",
  "impressions",
  "clicks",
  "reach",
  "saves",
] as const satisfies readonly (keyof DashboardTotals)[];

export type ReportMetric = (typeof reportMetrics)[number];

/** A figure of the range, and how it moved against the range before. */
export interface ReportCell {
  /** None where the range before is not all kept, or either is unknown. */
  readonly trend: Trend | null;
  /** Null where no platform of the workspace gives it. */
  readonly value: number | null;
}

/** A workspace's row of the report: its totals, then its followers. */
export interface ReportRow {
  readonly cells: readonly ReportCell[];
  readonly followers: ReportCell;
}

/** A workspace's row of the report: its totals, then its followers. */
export interface ReportRow {
  readonly cells: readonly ReportCell[];
  readonly followers: ReportCell;
}

/**
 * A workspace's row of the report: each total with its change, and its
 * followers with what they gained over the range. No change is shown
 * against a range before that is not all kept: its figures are missing
 * what the retention deleted.
 */
export const reportRowOf = (analytics: WorkspaceAnalytics): ReportRow => {
  const { followers, previousKept, previousTotals, totals } = analytics;

  return {
    cells: reportMetrics.map((metric) => ({
      trend: previousKept
        ? trendOf(totals[metric], previousTotals[metric])
        : null,
      value: totals[metric],
    })),
    followers: {
      trend:
        followers.gained === null
          ? null
          : { change: followers.gained, share: null },
      value: followers.current,
    },
  };
};
