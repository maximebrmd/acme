import { DateTime, Option, Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { InvalidDateRange } from "./invalid-date-range.ts";
import { InvalidTimeZone } from "./invalid-time-zone.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

const isCalendarDay = (written: string): boolean => {
  const [year = 0, month = 0, day = 0] = written.split("-").map(Number);

  return Option.exists(
    DateTime.make({ day, month, year }),
    (midnight) => DateTime.getPartUtc(midnight, "day") === day
  );
};

/** A day on the calendar, written `YYYY-MM-DD`, in no particular zone. */
export const CalendarDaySchema = Schema.String.check(
  Schema.isPattern(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u),
  Schema.makeFilter(isCalendarDay, { expected: "a day on the calendar" })
).annotate({ description: "A day, as YYYY-MM-DD.", identifier: "CalendarDay" });

export type CalendarDay = typeof CalendarDaySchema.Type;

const CountSchema = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

/**
 * A post's counts on its platform: likes (Mastodon's favourites), reposts
 * (Mastodon's boosts), replies, and quotes and impressions where the
 * platform gives them, null otherwise. Neither Mastodon nor Bluesky tells
 * impressions; Mastodon counts quotes from 4.5.
 */
export const PostMetricsSchema = Schema.Struct({
  impressions: Schema.NullOr(CountSchema),
  likes: CountSchema,
  quotes: Schema.NullOr(CountSchema),
  replies: CountSchema,
  reposts: CountSchema,
}).annotate({ identifier: "PostMetrics" });

export type PostMetrics = typeof PostMetricsSchema.Type;

/** A post's counts as read at one moment. */
export const MetricsSnapshotSchema = Schema.Struct({
  collectedAt: Schema.DateTimeUtc,
  metrics: PostMetricsSchema,
}).annotate({ identifier: "MetricsSnapshot" });

export type MetricsSnapshot = typeof MetricsSnapshotSchema.Type;

/** A post on one of its channels, and its counts over time. */
export const TargetMetricsSchema = Schema.Struct({
  channelId: Schema.String,
  // Whether its counts are still read: every hour for 48 hours after it
  // went live, then every day until it is 30 days old.
  collecting: Schema.Boolean,
  // When its counts were read last, if they were.
  lastCollectedAt: Schema.NullOr(Schema.DateTimeUtc),
  // Its counts as read last, if they were.
  latest: Schema.NullOr(PostMetricsSchema),
  // Its address on the platform, when the platform gave one.
  permalink: Schema.NullOr(Schema.String),
  publishedAt: Schema.DateTimeUtc,
  // Every reading, oldest first.
  snapshots: Schema.Array(MetricsSnapshotSchema),
  // The post's target on the channel, as the post lists it.
  targetId: Schema.String,
}).annotate({ identifier: "TargetMetrics" });

export type TargetMetrics = typeof TargetMetricsSchema.Type;

/** What analytics read of a post, channel by channel. */
export const PostAnalyticsSchema = Schema.Struct({
  postId: Schema.String,
  // One per channel the post went live on, by when it did.
  targets: Schema.Array(TargetMetricsSchema),
}).annotate({ identifier: "PostAnalytics" });

export type PostAnalytics = typeof PostAnalyticsSchema.Type;

const totals = {
  // Null when no post had any.
  impressions: Schema.NullOr(CountSchema),
  likes: CountSchema,
  // How many posts went live, counting each channel a post went out on.
  posts: CountSchema,
  // Null when no post had any.
  quotes: Schema.NullOr(CountSchema),
  replies: CountSchema,
  reposts: CountSchema,
};

/** The latest counts of the range's posts, added up. */
export const MetricTotalsSchema = Schema.Struct(totals).annotate({
  identifier: "MetricTotals",
});

export type MetricTotals = typeof MetricTotalsSchema.Type;

/** The same, for the posts of one channel. */
export const ChannelMetricsSchema = Schema.Struct({
  ...totals,
  channelId: Schema.String,
}).annotate({ identifier: "ChannelMetrics" });

export type ChannelMetrics = typeof ChannelMetricsSchema.Type;

/**
 * What the range's posts gained on one of its days: likes, reposts,
 * replies and quotes. A count can go down, when people take a like back.
 */
export const EngagementDaySchema = Schema.Struct({
  date: CalendarDaySchema,
  likes: Schema.Int,
  quotes: Schema.Int,
  replies: Schema.Int,
  reposts: Schema.Int,
}).annotate({ identifier: "EngagementDay" });

export type EngagementDay = typeof EngagementDaySchema.Type;

/** One of the range's posts that people did the most with. */
export const TopPostSchema = Schema.Struct({
  channelId: Schema.String,
  // Likes, reposts, replies and quotes together.
  engagement: CountSchema,
  metrics: PostMetricsSchema,
  permalink: Schema.NullOr(Schema.String),
  postId: Schema.String,
  publishedAt: Schema.DateTimeUtc,
  targetId: Schema.String,
}).annotate({ identifier: "TopPost" });

export type TopPost = typeof TopPostSchema.Type;

/**
 * The workspace's posts published over a range of days, in a time zone:
 * their latest counts, in all and by channel, what they gained each day,
 * and the five people did the most with.
 */
export const AnalyticsSummarySchema = Schema.Struct({
  channels: Schema.Array(ChannelMetricsSchema),
  // Every day of the range, in order.
  days: Schema.Array(EngagementDaySchema),
  from: CalendarDaySchema,
  timeZone: Schema.String,
  to: CalendarDaySchema,
  topPosts: Schema.Array(TopPostSchema),
  totals: MetricTotalsSchema,
}).annotate({ identifier: "AnalyticsSummary" });

export type AnalyticsSummary = typeof AnalyticsSummarySchema.Type;

const workspace = { workspaceId: Schema.String };

/** What a workspace's posts did on their platforms. */
export class AnalyticsApi extends HttpApiGroup.make("analytics")
  .add(
    HttpApiEndpoint.get("summary", "/summary", {
      error: [Forbidden, InvalidDateRange, InvalidTimeZone],
      params: workspace,
      query: {
        from: CalendarDaySchema,
        timeZone: Schema.String,
        to: CalendarDaySchema,
      },
      success: AnalyticsSummarySchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Sums up the posts published from `from` to `to`, both included and at most 366 days, as days run in `timeZone` (an IANA zone such as Europe/Paris): their latest counts in all and by channel, what they gained each day, and the five with the most engagement (likes, reposts, replies and quotes). Counts are read from the platforms every hour for 48 hours after a post goes live, then every day until it is 30 days old. Needs analytics:read.",
        summary: "Summarize the workspace's analytics",
      })
    ),
    HttpApiEndpoint.get("post", "/posts/:postId", {
      error: [Forbidden],
      params: { ...workspace, postId: Schema.String },
      success: PostAnalyticsSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with the counts of a post on each channel it went live on, over time. A post not published yet, or whose counts were not read yet, has no targets. Needs analytics:read.",
        summary: "Get a post's analytics",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/analytics") {}
