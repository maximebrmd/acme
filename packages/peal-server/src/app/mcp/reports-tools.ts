import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  AnalyticsDashboardSchema,
  AnalyticsSummarySchema,
  BillingSchema,
  CalendarDaySchema,
  ChannelSeriesSchema,
  CurrentMember,
  dashboardPeriods,
  maxTopPosts,
  PostAnalyticsSchema,
} from "peal-contract";

import { reading } from "#app/mcp/annotations.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";

export const AnalyticsSummary = Tool.make("analytics_summary", {
  dependencies: [CurrentMember],
  description:
    "Sums up the workspace's posts published from `from` to `to`, both included and 366 days at most, as days run in `timeZone`: their latest likes, reposts, replies, quotes and impressions in all and by channel, what they gained each day, and the five people did the most with. Counts are read from Mastodon, Bluesky, TikTok, YouTube, Instagram, Threads, Facebook Pages, LinkedIn pages, Pinterest (whose saves count as reposts and reactions as likes) and, where the server's operator turned its reads on, X, every hour for two days after a post goes live, then daily until it is 30 days old; quotes and impressions are null where the platform gives none.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    from: CalendarDaySchema,
    timeZone: Schema.String.annotate({
      description: "An IANA time zone, such as Europe/Paris.",
    }),
    to: CalendarDaySchema,
  }),
  success: AnalyticsSummarySchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Summarize analytics");

// A range of days: `days`, or `from` and `to`.
const range = {
  days: Schema.optionalKey(
    Schema.Literals(dashboardPeriods).annotate({
      description:
        "The last 7, 30 or 90 days, today included in `timeZone`. Give this, or `from` and `to`.",
    })
  ),
  from: Schema.optionalKey(CalendarDaySchema),
  timeZone: Schema.String.annotate({
    description: "An IANA time zone, such as Europe/Paris.",
  }),
  to: Schema.optionalKey(CalendarDaySchema),
};

export const AnalyticsDashboard = Tool.make("analytics_dashboard", {
  dependencies: [CurrentMember],
  description:
    "Answers the workspace's analytics over a range in one call, beside the range of the same length before it, so the trend is the difference: the totals of the posts published in each (likes, reposts, replies, quotes, impressions, clicks, reach, saves, engagement), followers at the end of each and what they gained, the same by channel and by platform, each day's gains, followers and account views, and the `topPosts` (5 unless said, 25 at most) with the most engagement. The range is `days` (7, 30 or 90, ending today), or `from` and `to`, both included and 366 days at most. Followers are kept from the day a channel is connected, read once a day. A number a platform does not give is null, which is unknown, never zero.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    ...range,
    topPosts: Schema.optionalKey(
      Schema.Int.check(Schema.isBetween({ maximum: maxTopPosts, minimum: 0 }))
    ),
  }),
  success: AnalyticsDashboardSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get the analytics dashboard");

export const ChannelAnalytics = Tool.make("channel_analytics", {
  dependencies: [CurrentMember],
  description:
    "Answers one channel's numbers day by day over a range (`days`, or `from` and `to`): its followers, the accounts it follows and its posts as Peal read them each UTC day, the views and reach its platform counted for the day, and what its posts published in the range gained. A number is null where the platform gives none, or on a day Peal read nothing; a channel Peal read nothing of has days without numbers.",
  failure: ToolRefused,
  parameters: Schema.Struct({ ...range, channelId: Schema.String }),
  success: ChannelSeriesSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get a channel's analytics");

export const PostAnalytics = Tool.make("post_analytics", {
  dependencies: [CurrentMember],
  description:
    "Answers with a post's counts on each channel it went live on, every reading over time. A post not published yet, or whose counts were not read yet, has no targets.",
  failure: ToolRefused,
  parameters: Schema.Struct({ postId: Schema.String }),
  success: PostAnalyticsSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get a post's analytics");

export const GetBilling = Tool.make("get_billing", {
  dependencies: [CurrentMember],
  description:
    "Answers with the workspace's plan, the subscription that buys it, what each limit allows (channels, members, posts going out a month, assistant requests a day, bytes of media stored), how much of each the workspace uses, every plan to compare with its prices in cents excluding VAT, and whether the trial is open. On a server that does not bill, nothing is limited. Ordering, cancelling and withdrawing are for owners and admins, in person, in the web app.",
  failure: ToolRefused,
  success: BillingSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get billing");

/** The tools that read how the workspace's posts did, and its plan. */
export const ReportTools = Toolkit.make(
  AnalyticsSummary,
  AnalyticsDashboard,
  ChannelAnalytics,
  PostAnalytics,
  GetBilling
);
