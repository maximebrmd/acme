import type {
  AnalyticsSummary,
  CalendarDay,
  MetricsSnapshot,
  PostMetrics,
} from "acme-contract";
import { DateTime, Option, Schema } from "effect";

import { addDays, dateKey, wallClockOf } from "#posts/zoned-time.ts";
import type { CalendarDate } from "#posts/zoned-time.ts";

import type { SummaryRange } from "./api.ts";

/** The ranges the page offers: the last 7, 30 or 90 days, today included. */
export const RangeSchema = Schema.Literals(["7", "30", "90"]);

export type Range = typeof RangeSchema.Type;

export const ranges: readonly Range[] = RangeSchema.literals;

export const defaultRange: Range = "30";

/** The day it is in the zone now, or in UTC for a zone that is not one. */
export const todayIn = (timeZone: string): CalendarDate =>
  Option.match(wallClockOf(DateTime.nowUnsafe(), timeZone), {
    onNone: () => {
      const { day, month, year } = DateTime.toParts(DateTime.nowUnsafe());

      return { day, month, year };
    },
    onSome: ({ date }) => date,
  });

/** The `days` days ending on `today`, as the server takes them. */
export const rangeEnding = (
  today: CalendarDate,
  range: Range,
  timeZone: string
): SummaryRange => ({
  from: dateKey(addDays(today, 1 - Number(range))),
  timeZone,
  to: dateKey(today),
});

/** A calendar day, at midnight UTC: format it with `timeZone: "UTC"`. */
export const dayDate = (day: CalendarDay): Date => {
  const [year = 1970, month = 1, date = 1] = day.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, date));
};

/** The counts a chart draws, in the order it stacks them. */
export const engagementKeys = [
  "likes",
  "reposts",
  "replies",
  "quotes",
] as const;

export type EngagementKey = (typeof engagementKeys)[number];

/**
 * Whether quotes are worth a series: some post of the range was on a
 * platform that counts them.
 */
export const countsQuotes = (summary: AnalyticsSummary): boolean =>
  summary.totals.quotes !== null;

/** The series a summary's chart shows. */
export const shownKeys = (
  summary: AnalyticsSummary
): readonly EngagementKey[] =>
  engagementKeys.filter((key) => key !== "quotes" || countsQuotes(summary));

/** Whether anything at all was read over the range. */
export const isEmpty = (summary: AnalyticsSummary): boolean =>
  summary.totals.posts === 0;

/** Likes, reposts, replies and quotes: what people did with a post. */
export const engagementOf = (metrics: PostMetrics): number =>
  metrics.likes + metrics.reposts + metrics.replies + (metrics.quotes ?? 0);

/** A post's readings as a chart draws them: one row per reading. */
export interface ReadingRow {
  readonly at: number;
  readonly likes: number;
  readonly quotes: number;
  readonly replies: number;
  readonly reposts: number;
}

export const readingRows = (
  snapshots: readonly MetricsSnapshot[]
): readonly ReadingRow[] =>
  snapshots.map(({ collectedAt, metrics }) => ({
    at: DateTime.toEpochMillis(collectedAt),
    likes: metrics.likes,
    quotes: metrics.quotes ?? 0,
    replies: metrics.replies,
    reposts: metrics.reposts,
  }));
