import {
  AnalyticsSummarySchema,
  BillingSchema,
  CalendarDaySchema,
  CurrentMember,
  PostAnalyticsSchema,
} from "peal-contract";
import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";

import { reading } from "#app/mcp/annotations.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";

export const AnalyticsSummary = Tool.make("analytics_summary", {
  dependencies: [CurrentMember],
  description:
    "Sums up the workspace's posts published from `from` to `to`, both included and 366 days at most, as days run in `timeZone`: their latest likes, reposts, replies, quotes and impressions in all and by channel, what they gained each day, and the five people did the most with. Counts are read from Mastodon, Bluesky, TikTok and YouTube every hour for two days after a post goes live, then daily until it is 30 days old; quotes and impressions are null where the platform gives none.",
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
    "Answers with the workspace's plan, the subscription that buys it, what each limit allows (channels, members, posts going out a month, assistant requests a day), how much of each the workspace uses, and every plan to compare. On a server that does not bill, nothing is limited. Changing the plan is for owners and admins, in the web app.",
  failure: ToolRefused,
  success: BillingSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get billing");

/** The tools that read how the workspace's posts did, and its plan. */
export const ReportTools = Toolkit.make(
  AnalyticsSummary,
  PostAnalytics,
  GetBilling
);
