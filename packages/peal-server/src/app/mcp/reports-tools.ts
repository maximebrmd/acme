import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  ActivityPageSchema,
  activityRetentionDays,
  AnalyticsSummarySchema,
  BillingSchema,
  CalendarDaySchema,
  CurrentMember,
  maxActivityPageSize,
  PostAnalyticsSchema,
} from "peal-contract";

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
    "Answers with the workspace's plan, the subscription that buys it, what each limit allows (channels, members, posts going out a month, assistant requests a day, bytes of media stored), how much of each the workspace uses, every plan to compare with its prices in cents excluding VAT, and whether the trial is open. On a server that does not bill, nothing is limited. Ordering, cancelling and withdrawing are for owners and admins, in person, in the web app.",
  failure: ToolRefused,
  success: BillingSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get billing");

export const ListActivity = Tool.make("list_activity", {
  dependencies: [CurrentMember],
  description: `Lists the requests that asked to change something in the workspace, newest first: who asked (a member's id or an API key's), how they authenticated (\`session\`, \`apiKey\`, \`oauth\` or \`mcp\`), the key or the application it came through, the operation (\`posts.schedule\`, or \`mcp.create_draft\` for a tool), the ids it named, the status answered and the error's code when it was refused. What this connection did is there too: use it to check what was done after a failure, before doing it again. Never what a request carried. Events are kept ${String(activityRetentionDays)} days. \`operation\` keeps one operation, \`actor\` one member or key; pass \`nextCursor\` as \`cursor\` for the next page. Owners only (activity:read).`,
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

/**
 * The tools that read how the workspace's posts did, its plan, and what
 * was changed in it, by whom.
 */
export const ReportTools = Toolkit.make(
  AnalyticsSummary,
  PostAnalytics,
  GetBilling,
  ListActivity
);
