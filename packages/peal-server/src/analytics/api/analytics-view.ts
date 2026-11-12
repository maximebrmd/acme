import { Option, Schema } from "effect";
import type {
  BestTimes as BestTimesView,
  AnalyticsDashboard as DashboardView,
  AnalyticsSummary as SummaryView,
  CalendarDay,
  ChannelSeries as ChannelSeriesView,
  DashboardTotals as DashboardTotalsView,
  FollowerChange as FollowersView,
  PostMetrics as MetricsView,
  TargetMetrics,
} from "peal-contract";

import type {
  ChannelSeries,
  Comparison,
  Dashboard,
  DashboardTotals,
} from "#analytics/application/analytics-dashboard.ts";
import type {
  AnalyticsSummary,
  ChannelBestTimes,
} from "#analytics/application/analytics-queries.ts";
import type {
  CountTotals,
  PostHistory,
} from "#analytics/application/analytics-reports.ts";
import type { FollowerChange } from "#analytics/domain/account-series.ts";
import {
  minimumPosts,
  minimumPostsPerHour,
} from "#analytics/domain/best-times.ts";
import type { HourBucket } from "#analytics/domain/best-times.ts";
import { engagementOf } from "#analytics/domain/post-metrics.ts";
import type { PostMetrics } from "#analytics/domain/post-metrics.ts";
import type { TrackedPost } from "#analytics/domain/tracked-post.ts";
import { isoDateOf, LocalDateSchema } from "#shared/domain/wall-clock.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

// What clients see of analytics, which the API and the MCP tools answer.

const decodeDate = Schema.decodeUnknownOption(LocalDateSchema);

/** A day as the contract writes it: YYYY-MM-DD. */
export const dayView = (date: LocalDate): CalendarDay => isoDateOf(date);

/**
 * The day a request names. The contract checked it is on the calendar. One
 * before 1970 is not a date Peal keeps, and no post went out then: no range
 * has it.
 */
export const dateFrom = (day: CalendarDay) => {
  const [year = 0, month = 0, date = 0] = day.split("-").map(Number);

  return decodeDate({ day: date, month, year });
};

/** What clients see of a post's counts. */
export const metricsView = (metrics: PostMetrics): MetricsView => ({
  clicks: Option.getOrNull(metrics.clicks),
  impressions: Option.getOrNull(metrics.impressions),
  likes: metrics.likes,
  quotes: Option.getOrNull(metrics.quotes),
  reach: Option.getOrNull(metrics.reach),
  replies: metrics.replies,
  reposts: metrics.reposts,
  saves: Option.getOrNull(metrics.saves),
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

const topPostsView = (posts: readonly TrackedPost[]) =>
  posts.flatMap((post) =>
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
  );

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
  topPosts: topPostsView(summary.topPosts),
  totals: totalsView(summary.totals),
});

const followersView = (change: FollowerChange): FollowersView => ({
  current: Option.getOrNull(change.current),
  gained: Option.getOrNull(change.gained),
});

const dashboardTotalsView = (totals: DashboardTotals): DashboardTotalsView => ({
  clicks: Option.getOrNull(totals.clicks),
  engagement: totals.engagement,
  impressions: Option.getOrNull(totals.impressions),
  likes: totals.likes,
  posts: totals.posts,
  quotes: Option.getOrNull(totals.quotes),
  reach: Option.getOrNull(totals.reach),
  replies: totals.replies,
  reposts: totals.reposts,
  saves: Option.getOrNull(totals.saves),
});

const comparisonView = (comparison: Comparison) => ({
  followers: followersView(comparison.followers),
  previousFollowers: followersView(comparison.previousFollowers),
  previousKept: comparison.previousKept,
  previousTotals: dashboardTotalsView(comparison.previousTotals),
  totals: dashboardTotalsView(comparison.totals),
});

/** What clients see of a dashboard. */
export const dashboardView = (dashboard: Dashboard): DashboardView => ({
  ...comparisonView(dashboard),
  channels: dashboard.channels.map((channel) => ({
    ...comparisonView(channel),
    channelId: channel.channelId,
    platform: Option.getOrNull(channel.platform),
  })),
  days: dashboard.days.map((day) => ({
    date: dayView(day.date),
    followers: Option.getOrNull(day.followers),
    likes: day.likes,
    quotes: day.quotes,
    reach: Option.getOrNull(day.reach),
    replies: day.replies,
    reposts: day.reposts,
    views: Option.getOrNull(day.views),
  })),
  from: dayView(dashboard.range.from),
  platforms: dashboard.platforms.map((platform) => ({
    ...comparisonView(platform),
    platform: platform.platform,
  })),
  previous: {
    from: dayView(dashboard.previous.from),
    to: dayView(dashboard.previous.to),
  },
  timeZone: dashboard.range.timeZone,
  to: dayView(dashboard.range.to),
  topPosts: topPostsView(dashboard.topPosts),
});

/** What clients see of a channel's numbers over time. */
export const channelSeriesView = (
  channelId: string,
  series: ChannelSeries
): ChannelSeriesView => ({
  channelId,
  days: series.days.map((day) => ({
    date: dayView(day.date),
    followers: Option.getOrNull(day.followers),
    following: Option.getOrNull(day.following),
    likes: day.likes,
    posts: Option.getOrNull(day.posts),
    quotes: day.quotes,
    reach: Option.getOrNull(day.reach),
    replies: day.replies,
    reposts: day.reposts,
    views: Option.getOrNull(day.views),
  })),
  followers: followersView(series.followers),
  from: dayView(series.range.from),
  platform: Option.getOrNull(series.platform),
  timeZone: series.range.timeZone,
  to: dayView(series.range.to),
  totals: dashboardTotalsView(series.totals),
});

const hourView = (bucket: HourBucket) => ({
  hour: bucket.hour,
  median: Option.getOrNull(bucket.median),
  posts: bucket.posts,
  weekday: bucket.weekday,
});

/** What clients see of when a channel's posts did best. */
export const bestTimesView = (found: ChannelBestTimes): BestTimesView => ({
  best: found.best.map(hourView),
  buckets: found.buckets.map(hourView),
  channelId: found.channelId,
  counted: found.counted,
  days: found.days,
  enough: found.enough,
  from: dayView(found.from),
  minimumPosts,
  minimumPostsPerHour,
  platform: found.platform,
  posts: found.posts,
  recent: found.recent,
  timeZone: found.timeZone,
  to: dayView(found.to),
});
