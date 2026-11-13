import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  ActivityPageSchema,
  activityRetentionDays,
  AnalyticsDashboardSchema,
  AnalyticsSummarySchema,
  bestTimesMinimumPosts,
  bestTimesMinimumPostsPerHour,
  bestTimesPeriods,
  BestTimesSchema,
  bestTimesSettlingHours,
  BillingSchema,
  CalendarDaySchema,
  ChannelSeriesSchema,
  CurrentMember,
  dashboardPeriods,
  defaultUsageRangeDays,
  maxUsageRangeDays,
  usageRetentionDays,
  maxTopPosts,
  maxActivityPageSize,
  PostAnalyticsSchema,
  defaultShortLinkRangeDays,
  maxShortLinkPageSize,
  maxShortLinkRangeDays,
  shortLinkClickRetentionDays,
  ShortLinkPageSchema,
  ShortLinkReportSchema,
  ShortLinkStatusSchema,
  WorkspaceUsageReportSchema,
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

export const BestTimes = Tool.make("best_times", {
  dependencies: [CurrentMember],
  description: `Describes when one channel's posts did best in the past, by weekday and hour in \`timeZone\`, over the last \`days\` (30, 90 or 180; 90 unless given, fewer where the platform lets Peal keep less): for each hour, how many posts went live in it and the median of what each was given (likes, reposts, replies and quotes, those the platform gives). It is no prediction: what did well before may not again, and counts of different platforms are never compared, so ask channel by channel. An hour with fewer than ${String(bestTimesMinimumPostsPerHour)} posts has no median. \`enough: false\` means the channel has fewer than ${String(bestTimesMinimumPosts)} posts in the range: nothing is ranked, and \`best\` is empty; say so rather than guess. \`counted: false\` means the platform gives none of those counts. Posts younger than ${String(bestTimesSettlingHours)} hours are left out (\`recent\`).`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelId: Schema.String,
    days: Schema.optionalKey(Schema.Literals(bestTimesPeriods)),
    timeZone: Schema.String.annotate({
      description: "An IANA time zone, such as Europe/Paris.",
    }),
  }),
  success: BestTimesSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get when a channel's posts did best");

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
    "Answers with the workspace's plan, the subscription that buys it, what each limit allows (channels, members, posts going out a month, assistant requests a day, bytes of media stored), how much of each the workspace uses, every plan to compare with its prices in cents excluding VAT, and whether the trial is open. With per-account pricing: the rate card, the billing account's connected accounts, whether it pays with a payment method, and, for the workspace that bills the account only, this month's (UTC) account-days, what they cost so far and the month's estimate excluding tax (US dollar cents), what one more account costs a month, and the next invoice's total, tax included, when the payment provider says. On a server that does not bill, nothing is limited or priced. Ordering, cancelling and withdrawing are for owners and admins, in person, in the web app.",
  failure: ToolRefused,
  success: BillingSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get billing");

export const GetUsage = Tool.make("get_usage", {
  dependencies: [CurrentMember],
  description: `Answers what the workspace uses of its plan now, then for each UTC day from \`from\` to \`to\` (both included, ${String(maxUsageRangeDays)} at most; the last ${String(defaultUsageRangeDays)} by default): posts that went out, one per channel, by platform; assistant requests, channels, members and media bytes as the daily snapshot took them (null for a day without one, today's included). For the workspace that bills its billing account on a server that bills per account, each day's \`billableAccounts\` (the most connected at once across the account, 0 on the 31st). Then totals: channel-days, billable account-days, and posts on platforms that bill per post by month. \`sharedWith\` names the partner workspace whose plan it is on. Kept ${String(usageRetentionDays)} days. Counts only; \`plan\` is null on a server that does not bill.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    from: Schema.optionalKey(CalendarDaySchema),
    to: Schema.optionalKey(CalendarDaySchema),
  }),
  success: WorkspaceUsageReportSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get usage");

export const ListActivity = Tool.make("list_activity", {
  dependencies: [CurrentMember],
  description: `Lists the requests that asked to change something in the workspace, newest first: who asked (a member's id or an API key's), how they authenticated (\`session\`, \`apiKey\`, \`oauth\`, \`mcp\`, \`partnerKey\` or \`connectLink\`), the key or the application it came through, the operation (\`posts.schedule\`, or \`mcp.create_draft\` for a tool), the ids it named, the status answered and the error's code when it was refused. What this connection did is there too: use it to check what was done after a failure, before doing it again. Never what a request carried. Events are kept ${String(activityRetentionDays)} days. \`operation\` keeps one operation, \`actor\` one member or key; pass \`nextCursor\` as \`cursor\` for the next page. Owners only (activity:read).`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    actor: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(128))),
    cursor: Schema.optionalKey(Schema.String),
    limit: Schema.optionalKey(
      Schema.Int.check(
        Schema.isBetween({ maximum: maxActivityPageSize, minimum: 1 })
      )
    ),
    operation: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(200))),
  }),
  success: ActivityPageSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List activity");

const approximateClicks = `Clicks are counted by UTC day and kept ${String(shortLinkClickRetentionDays)} days; automated readers (crawlers, link previews) and prefetches are left out by their names, so counts are approximate, and nothing about visitors is kept.`;

export const GetShortLinkStatus = Tool.make("get_short_link_status", {
  dependencies: [CurrentMember],
  description:
    "Answers whether this server shortens links (`available`: off unless its operator set where short links live), what a short address starts with (`base`) and how long it is (`shortLength`), and whether the workspace's new posts ask for short links by default (`byDefault`). A new post that leaves `shortenLinks` out (create_draft, create_post, create_posts, feeds, the web app and the API alike) takes `byDefault` when it is made, and `false` always wins; on a server without short links nothing is shortened. A post that asks goes out with each link written with http:// or https:// and longer than a short address replaced, per channel; the text kept stays as written, and Pinterest, Instagram and TikTok keep links as written, as does a link to a channel's own platform.",
  failure: ToolRefused,
  parameters: Tool.EmptyParams,
  success: ShortLinkStatusSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get the short links' status");

const clickDays = {
  from: Schema.optionalKey(CalendarDaySchema),
  to: Schema.optionalKey(CalendarDaySchema),
};

export const ListShortLinks = Tool.make("list_short_links", {
  dependencies: [CurrentMember],
  description: `Lists the short links the workspace's posts went out with, newest first, those of one post (\`postId\`) or one channel (\`channelId\`), each with where it leads, its post, channel and part, and its clicks from \`from\` to \`to\` (UTC days, both included, ${String(maxShortLinkRangeDays)} at most; the last ${String(defaultShortLinkRangeDays)} by default). Pass \`nextCursor\` as \`cursor\` for the next page (${String(maxShortLinkPageSize)} links at most a page). ${approximateClicks} Needs analytics:read.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelId: Schema.optionalKey(Schema.String),
    cursor: Schema.optionalKey(Schema.String),
    limit: Schema.optionalKey(
      Schema.Int.check(
        Schema.isBetween({ maximum: maxShortLinkPageSize, minimum: 1 })
      )
    ),
    postId: Schema.optionalKey(Schema.String),
    ...clickDays,
  }),
  success: ShortLinkPageSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List short links");

export const GetShortLink = Tool.make("get_short_link", {
  dependencies: [CurrentMember],
  description: `Answers one short link, by the id list_short_links gives, with its clicks each UTC day from \`from\` to \`to\` (both included, ${String(maxShortLinkRangeDays)} at most; the last ${String(defaultShortLinkRangeDays)} by default), oldest first. ${approximateClicks} Needs analytics:read.`,
  failure: ToolRefused,
  parameters: Schema.Struct({ linkId: Schema.String, ...clickDays }),
  success: ShortLinkReportSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get a short link");

/**
 * The tools that read how the workspace's posts did, its plan and what it
 * used of it, what was changed in it, by whom, and its short links' clicks.
 */
export const ReportTools = Toolkit.make(
  AnalyticsSummary,
  AnalyticsDashboard,
  ChannelAnalytics,
  BestTimes,
  PostAnalytics,
  GetBilling,
  GetUsage,
  ListActivity,
  GetShortLinkStatus,
  ListShortLinks,
  GetShortLink
);
