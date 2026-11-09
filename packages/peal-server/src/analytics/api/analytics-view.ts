import type {
  AnalyticsSummary as SummaryView,
  CalendarDay,
  PostMetrics as MetricsView,
  TargetMetrics,
} from "acme-contract";
import { Option, Schema } from "effect";

import type { AnalyticsSummary } from "#analytics/application/analytics-queries.ts";
import type {
  CountTotals,
  PostHistory,
} from "#analytics/application/analytics-reports.ts";
import { engagementOf } from "#analytics/domain/post-metrics.ts";
import type { PostMetrics } from "#analytics/domain/post-metrics.ts";
import { LocalDateSchema } from "#shared/domain/wall-clock.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

// What clients see of analytics, which the API and the MCP tools answer.

const decodeDate = Schema.decodeUnknownOption(LocalDateSchema);

const pad = (value: number, length = 2) =>
  value.toString().padStart(length, "0");

/** A day as the contract writes it: YYYY-MM-DD. */
export const dayView = ({ day, month, year }: LocalDate): CalendarDay =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

/**
 * The day a request names. The contract checked it is on the calendar. One
 * before 1970 is not a date Acme keeps, and no post went out then: no range
 * has it.
 */
export const dateFrom = (day: CalendarDay) => {
  const [year = 0, month = 0, date = 0] = day.split("-").map(Number);

  return decodeDate({ day: date, month, year });
};

const metricsView = (metrics: PostMetrics): MetricsView => ({
  impressions: Option.getOrNull(metrics.impressions),
  likes: metrics.likes,
  quotes: Option.getOrNull(metrics.quotes),
  replies: metrics.replies,
  reposts: metrics.reposts,
});

const totalsView = (totals: CountTotals) => ({
  impressions: Option.getOrNull(totals.impressions),
  likes: totals.likes,
  posts: totals.posts,
  quotes: Option.getOrNull(totals.quotes),
  replies: totals.replies,
  reposts: totals.reposts,
});

/** What clients see of a post's counts on one channel. */
export const targetView = ({
  post,
  snapshots,
}: PostHistory): TargetMetrics => ({
  channelId: post.channelId,
  collecting: post.collection._tag === "collecting",
  lastCollectedAt: Option.getOrNull(post.lastCollectedAt),
  latest: post.latest.pipe(Option.map(metricsView), Option.getOrNull),
  permalink: Option.getOrNull(post.permalink),
  publishedAt: post.publishedAt,
  snapshots: snapshots.map(({ collectedAt, metrics }) => ({
    collectedAt,
    metrics: metricsView(metrics),
  })),
  targetId: post.targetId,
});

/** What clients see of a summary. */
export const summaryView = (summary: AnalyticsSummary): SummaryView => ({
  channels: summary.channels.map((channel) => ({
    ...totalsView(channel),
    channelId: channel.channelId,
  })),
  days: summary.days.map(({ date, ...gains }) => ({
    ...gains,
    date: dayView(date),
  })),
  from: dayView(summary.range.from),
  timeZone: summary.range.timeZone,
  to: dayView(summary.range.to),
  topPosts: summary.topPosts.flatMap((post) =>
    Option.match(post.latest, {
      onNone: () => [],
      onSome: (metrics) => [
        {
          channelId: post.channelId,
          engagement: engagementOf(metrics),
          metrics: metricsView(metrics),
          permalink: Option.getOrNull(post.permalink),
          postId: post.postId,
          publishedAt: post.publishedAt,
          targetId: post.targetId,
        },
      ],
    })
  ),
  totals: totalsView(summary.totals),
});
