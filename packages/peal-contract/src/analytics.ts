import { DateTime, Option, Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { InvalidDateRange } from "./invalid-date-range.ts";
import { InvalidTimeZone } from "./invalid-time-zone.ts";
import { PlatformSchema } from "./platform.ts";
import type { Platform } from "./platform.ts";
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
 * The platforms Peal reads counts on so far: a post that went out on any
 * other has none. The server's list (src/analytics/domain/
 * counted-platforms.ts) is the source; a test keeps the two equal.
 */
export const countedPlatforms = [
  "mastodon",
  "bluesky",
  "tiktok",
  "youtube",
  "instagram",
  "pinterest",
  // Company pages only: a LinkedIn profile's posts have no counts.
  "linkedin",
  // Reactions, comments and shares; views once a Page grants its insights.
  "facebook",
  // Accounts that granted their insights.
  "threads",
  // On a server whose operator turned X reads on: X bills each one.
  "x",
] as const satisfies readonly Platform[];

/**
 * A post's counts on its platform: likes (Mastodon's favourites,
 * Pinterest's reactions), reposts (Mastodon's boosts, Pinterest's saves),
 * replies, and quotes and impressions where the platform gives them, null
 * otherwise. Neither Mastodon nor Bluesky tells
 * impressions; Mastodon counts quotes from 4.5. Clicks, reach (the accounts
 * that saw the post) and saves (bookmarks) are null on every platform that
 * does not tell them: null is unknown, never zero.
 */
export const PostMetricsSchema = Schema.Struct({
  clicks: Schema.NullOr(CountSchema),
  impressions: Schema.NullOr(CountSchema),
  likes: CountSchema,
  quotes: Schema.NullOr(CountSchema),
  reach: Schema.NullOr(CountSchema),
  replies: CountSchema,
  reposts: CountSchema,
  saves: Schema.NullOr(CountSchema),
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

/** How many posts a dashboard ranks at most. */
export const maxTopPosts = 25;

/** The ranges a dashboard offers by a number of days, today included. */
export const dashboardPeriods = [7, 30, 90] as const;

/**
 * The latest counts of a range's posts, added up. Quotes, impressions,
 * clicks, reach and saves are null when no post had any: unknown, never
 * zero. Engagement is likes, reposts, replies and quotes together.
 */
export const DashboardTotalsSchema = Schema.Struct({
  clicks: Schema.NullOr(CountSchema),
  engagement: CountSchema,
  impressions: Schema.NullOr(CountSchema),
  likes: CountSchema,
  // How many posts went live, counting each channel a post went out on.
  posts: CountSchema,
  quotes: Schema.NullOr(CountSchema),
  reach: Schema.NullOr(CountSchema),
  replies: CountSchema,
  reposts: CountSchema,
  saves: Schema.NullOr(CountSchema),
}).annotate({ identifier: "DashboardTotals" });

export type DashboardTotals = typeof DashboardTotalsSchema.Type;

/**
 * Followers over a range: how many at its end, and how many more than at
 * its start (fewer, when negative). `gained` counts from the first day
 * Peal read the account when that is within the range, as Peal keeps
 * followers from the day a channel is connected. Null where Peal has read
 * none.
 */
export const FollowerChangeSchema = Schema.Struct({
  current: Schema.NullOr(CountSchema),
  gained: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "FollowerChange" });

export type FollowerChange = typeof FollowerChangeSchema.Type;

const comparison = {
  // Followers at the end of the range, and their change over it.
  followers: FollowerChangeSchema,
  // The same change over the range before.
  previousFollowers: FollowerChangeSchema,
  // The posts published over the range before, of the same length.
  previousTotals: DashboardTotalsSchema,
  totals: DashboardTotalsSchema,
};

/** A dashboard's numbers for one channel. */
export const ChannelDashboardSchema = Schema.Struct({
  ...comparison,
  channelId: Schema.String,
  // Null for a channel that left the workspace before Peal noted it.
  platform: Schema.NullOr(PlatformSchema),
}).annotate({ identifier: "ChannelDashboard" });

export type ChannelDashboard = typeof ChannelDashboardSchema.Type;

/** A dashboard's numbers for the channels of one platform. */
export const PlatformDashboardSchema = Schema.Struct({
  ...comparison,
  platform: PlatformSchema,
}).annotate({ identifier: "PlatformDashboard" });

export type PlatformDashboard = typeof PlatformDashboardSchema.Type;

/**
 * One day of a dashboard: what the range's posts gained (a count can go
 * down), the followers of the channels Peal had read by then, added up,
 * and the views and reach the platforms counted for the accounts that day
 * (a UTC day), null where none tells them.
 */
export const DashboardDaySchema = Schema.Struct({
  date: CalendarDaySchema,
  followers: Schema.NullOr(CountSchema),
  likes: Schema.Int,
  quotes: Schema.Int,
  reach: Schema.NullOr(CountSchema),
  replies: Schema.Int,
  reposts: Schema.Int,
  views: Schema.NullOr(CountSchema),
}).annotate({ identifier: "DashboardDay" });

export type DashboardDay = typeof DashboardDaySchema.Type;

/**
 * A workspace's analytics over a range of days, in one answer: the range
 * and the one before it, the totals and followers of each with what
 * changed, the same by channel and by platform, each day, and the posts
 * people did the most with.
 */
export const AnalyticsDashboardSchema = Schema.Struct({
  ...comparison,
  channels: Schema.Array(ChannelDashboardSchema),
  // Every day of the range, in order.
  days: Schema.Array(DashboardDaySchema),
  from: CalendarDaySchema,
  platforms: Schema.Array(PlatformDashboardSchema),
  // The range before, of the same length, which the trend compares with.
  previous: Schema.Struct({ from: CalendarDaySchema, to: CalendarDaySchema }),
  timeZone: Schema.String,
  to: CalendarDaySchema,
  topPosts: Schema.Array(TopPostSchema),
}).annotate({ identifier: "AnalyticsDashboard" });

export type AnalyticsDashboard = typeof AnalyticsDashboardSchema.Type;

/**
 * One day of a channel: its account as Peal read it that UTC day
 * (followers, the accounts it follows, its posts), the views and reach its
 * platform counted for the day, and what the channel's posts published in
 * the range gained. Each account number is null where the platform gives
 * none, or on a day Peal read nothing.
 */
export const ChannelDaySchema = Schema.Struct({
  date: CalendarDaySchema,
  followers: Schema.NullOr(CountSchema),
  following: Schema.NullOr(CountSchema),
  likes: Schema.Int,
  posts: Schema.NullOr(CountSchema),
  quotes: Schema.Int,
  reach: Schema.NullOr(CountSchema),
  replies: Schema.Int,
  reposts: Schema.Int,
  views: Schema.NullOr(CountSchema),
}).annotate({ identifier: "ChannelDay" });

export type ChannelDay = typeof ChannelDaySchema.Type;

/** A channel's numbers day by day over a range. */
export const ChannelSeriesSchema = Schema.Struct({
  channelId: Schema.String,
  // Every day of the range, in order.
  days: Schema.Array(ChannelDaySchema),
  followers: FollowerChangeSchema,
  from: CalendarDaySchema,
  platform: Schema.NullOr(PlatformSchema),
  timeZone: Schema.String,
  to: CalendarDaySchema,
  totals: DashboardTotalsSchema,
}).annotate({ identifier: "ChannelSeries" });

export type ChannelSeries = typeof ChannelSeriesSchema.Type;

/** What an export lists: each post of the range, or each channel's days. */
export const ExportKindSchema = Schema.Literals(["posts", "accounts"]).annotate(
  { identifier: "AnalyticsExportKind" }
);

export type ExportKind = typeof ExportKindSchema.Type;

/** How an export is written: CSV, or JSON, one object a line. */
export const ExportFormatSchema = Schema.Literals(["csv", "json"]).annotate({
  identifier: "AnalyticsExportFormat",
});

export type ExportFormat = typeof ExportFormatSchema.Type;

/** The columns of each kind of export, in the order a CSV writes them. */
export const exportColumns = {
  accounts: [
    "date",
    "channelId",
    "platform",
    "followers",
    "following",
    "posts",
    "views",
    "reach",
  ],
  posts: [
    "publishedAt",
    "postId",
    "targetId",
    "channelId",
    "platform",
    "permalink",
    "likes",
    "reposts",
    "replies",
    "quotes",
    "impressions",
    "clicks",
    "reach",
    "saves",
    "lastCollectedAt",
  ],
} as const satisfies Readonly<Record<ExportKind, readonly string[]>>;

// A range of days: `days` for the last 7, 30 or 90 ending today in the
// zone, or `from` and `to`.
const range = {
  days: Schema.optionalKey(
    Schema.NumberFromString.pipe(
      Schema.decodeTo(Schema.Literals(dashboardPeriods))
    )
  ),
  from: Schema.optionalKey(CalendarDaySchema),
  timeZone: Schema.String,
  to: Schema.optionalKey(CalendarDaySchema),
};

const rangeWords =
  "The range is `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most 366 days; `timeZone` is an IANA zone such as Europe/Paris.";

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
    HttpApiEndpoint.get("dashboard", "/dashboard", {
      error: [Forbidden, InvalidDateRange, InvalidTimeZone],
      params: workspace,
      query: {
        ...range,
        topPosts: Schema.optionalKey(
          Schema.NumberFromString.pipe(
            Schema.decodeTo(
              Schema.Int.check(
                Schema.isBetween({ maximum: maxTopPosts, minimum: 0 })
              )
            )
          )
        ),
      },
      success: AnalyticsDashboardSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Answers a workspace's analytics over a range in one call: the totals of the posts published in it and of those published in the range before, of the same length, so a client shows the trend; followers at the end of each and their change; the same by channel and by platform; each day's gains, followers and account views; and the \`topPosts\` (5 unless said, 25 at most) with the most engagement. ${rangeWords} Followers are kept from the day a channel is connected, read once a day; a number a platform does not give is null, never zero. Needs analytics:read.`,
        summary: "Get the workspace's analytics dashboard",
      })
    ),
    HttpApiEndpoint.get("channel", "/channels/:channelId", {
      error: [Forbidden, InvalidDateRange, InvalidTimeZone],
      params: { ...workspace, channelId: Schema.String },
      query: range,
      success: ChannelSeriesSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Answers one channel's numbers day by day: its followers, the accounts it follows and its posts as read each UTC day, the views and reach its platform counted, and what its posts published in the range gained. ${rangeWords} A channel Peal has read nothing of answers days without numbers. Needs analytics:read.`,
        summary: "Get a channel's analytics over time",
      })
    ),
    HttpApiEndpoint.get("export", "/export", {
      error: [Forbidden, InvalidDateRange, InvalidTimeZone],
      params: workspace,
      query: {
        ...range,
        format: Schema.optionalKey(ExportFormatSchema),
        kind: ExportKindSchema,
      },
      success: HttpApiSchema.StreamUint8Array({
        contentType: ["text/csv", "application/x-ndjson"],
      }),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Streams the workspace's analytics as a file: \`kind=posts\` lists each post published in the range on each channel with its latest counts, \`kind=accounts\` each channel's account day by day. \`format=csv\` (the default) writes a header line then one line a row, as RFC 4180; \`format=json\` writes one JSON object a line (\`application/x-ndjson\`). A number a platform does not give is empty in CSV and null in JSON. ${rangeWords} Needs analytics:read.`,
        summary: "Export the workspace's analytics",
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
