import { DateTime, Option } from "effect";
import { exportColumns } from "peal-contract";
import type { ExportFormat, ExportKind } from "peal-contract";

import type { ExportRow } from "#analytics/application/analytics-queries.ts";
import type { PostMetrics } from "#analytics/domain/post-metrics.ts";
import { csvLine } from "#shared/api/csv.ts";
import type { Cell } from "#shared/api/csv.ts";

// How an export is written: a line a row, as CSV or as JSON.

export { csvLine } from "#shared/api/csv.ts";

export type { Cell } from "#shared/api/csv.ts";

/** A line of JSON: one object, its keys the columns in order. */
export const ndjsonLine = (
  columns: readonly string[],
  cells: readonly Cell[]
): string =>
  `${JSON.stringify(
    Object.fromEntries(
      columns.map((column, index) => [column, cells[index] ?? null])
    )
  )}\n`;

const instant = (at: Option.Option<DateTime.Utc>) =>
  at.pipe(Option.map(DateTime.formatIso), Option.getOrNull);

/** A row's cells, in the order of its kind's columns. */
export const cellsOf = (exported: ExportRow): readonly Cell[] => {
  if (exported._tag === "accountDay") {
    const { row } = exported;

    return [
      row.day,
      row.channelId,
      row.platform,
      Option.getOrNull(row.followers),
      Option.getOrNull(row.following),
      Option.getOrNull(row.posts),
      Option.getOrNull(row.views),
      Option.getOrNull(row.reach),
    ];
  }

  const { platform, post } = exported.row;

  const count = (pick: (metrics: PostMetrics) => Option.Option<number>) =>
    post.latest.pipe(Option.flatMap(pick), Option.getOrNull);

  return [
    DateTime.formatIso(post.publishedAt),
    post.postId,
    post.targetId,
    post.channelId,
    Option.getOrNull(platform),
    Option.getOrNull(post.permalink),
    count((metrics) => Option.some(metrics.likes)),
    count((metrics) => Option.some(metrics.reposts)),
    count((metrics) => Option.some(metrics.replies)),
    count((metrics) => metrics.quotes),
    count((metrics) => metrics.impressions),
    count((metrics) => metrics.clicks),
    count((metrics) => metrics.reach),
    count((metrics) => metrics.saves),
    instant(post.lastCollectedAt),
  ];
};

/** The media type of each format. */
export const contentTypes = {
  csv: "text/csv; charset=utf-8",
  json: "application/x-ndjson",
} as const satisfies Readonly<Record<ExportFormat, string>>;

/** The line that starts a file: a CSV's header, nothing for JSON. */
export const headerOf = (kind: ExportKind, format: ExportFormat): string =>
  format === "csv" ? csvLine(exportColumns[kind]) : "";

/** A row's line in a format. */
export const lineOf = (
  kind: ExportKind,
  format: ExportFormat,
  row: ExportRow
): string =>
  format === "csv"
    ? csvLine(cellsOf(row))
    : ndjsonLine(exportColumns[kind], cellsOf(row));
