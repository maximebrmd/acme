import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { CalendarDaySchema } from "./analytics.ts";
import { Authentication } from "./authentication.ts";
import { PlanSchema } from "./billing-plans.ts";
import { PlanAllowancesSchema, UsageSchema } from "./billing.ts";
import { Forbidden } from "./forbidden.ts";
import { ByteCountSchema, Int64Schema } from "./int64.ts";
import { InvalidDateRange } from "./invalid-date-range.ts";
import { PlatformSchema } from "./platform.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** How many days a usage report covers at most, both ends included. */
export const maxUsageRangeDays = 92;

/** How many days a usage report covers when not told, ending today (UTC). */
export const defaultUsageRangeDays = 30;

/** How many days the server keeps a workspace's usage, day by day. */
export const usageRetentionDays = 400;

/** How many posts went out on one platform. */
export const PlatformPostsSchema = Schema.Struct({
  platform: PlatformSchema,
  posts: Schema.Int,
}).annotate({ identifier: "PlatformPosts" });

export type PlatformPosts = typeof PlatformPostsSchema.Type;

/**
 * A day (UTC) of a workspace's usage: what it held when the daily snapshot
 * ran, shortly after the day ended (00:11 UTC, or up to 12 hours later),
 * null for a day the server took no snapshot of, and what happened that
 * day.
 */
export const UsageDaySchema = Schema.Struct({
  // The requests sent to the writing assistant that day, as the daily
  // snapshot copied them; null for a day without a snapshot, today's
  // included.
  assistantRequests: Schema.NullOr(Schema.Int),
  // The day's posts by platform, by the platforms' names.
  byPlatform: Schema.Array(PlatformPostsSchema),
  // The channels the workspace itself had connected when the day's snapshot
  // ran, shortly after the day ended.
  channels: Schema.NullOr(Schema.Int),
  day: CalendarDaySchema,
  // Bytes of media stored when the day's snapshot ran.
  mediaStorage: Schema.NullOr(ByteCountSchema),
  members: Schema.NullOr(Schema.Int),
  // The posts that went out that day, one per channel; a thread is one.
  publishedPosts: Schema.Int,
}).annotate({ identifier: "UsageDay" });

export type UsageDay = typeof UsageDaySchema.Type;

/**
 * A month's posts on a platform that bills the server for each post, and
 * how many of them held a link.
 */
export const MeteredPostsSchema = Schema.Struct({
  // The month, as its first day (UTC).
  month: CalendarDaySchema,
  platform: PlatformSchema,
  posts: Schema.Int,
  postsWithLinks: Schema.Int,
}).annotate({ identifier: "MeteredPosts" });

export type MeteredPosts = typeof MeteredPostsSchema.Type;

/** A period's usage, added up. */
export const UsageTotalsSchema = Schema.Struct({
  byPlatform: Schema.Array(PlatformPostsSchema),
  // The days' `channels` added up, the days without a snapshot left out:
  // the figure a price per connected channel and day would be based on.
  channelDays: Int64Schema,
  // How many days `channelDays` counts.
  daysCounted: Schema.Int,
  // Each calendar month (UTC) the period touches, whole, on each platform
  // that bills the server per post.
  meteredPosts: Schema.Array(MeteredPostsSchema),
  publishedPosts: Schema.Int,
}).annotate({ identifier: "UsageTotals" });

export type UsageTotals = typeof UsageTotalsSchema.Type;

/** Whose plan a workspace's channels count against, when not its own. */
export const UsageSharingSchema = Schema.Struct({
  // The partner's home workspace, whose plan this workspace is on.
  partnerWorkspaceId: Schema.String,
}).annotate({ identifier: "UsageSharing" });

export type UsageSharing = typeof UsageSharingSchema.Type;

/** The days a report covers, both included. */
export const UsagePeriodSchema = Schema.Struct({
  from: CalendarDaySchema,
  to: CalendarDaySchema,
}).annotate({ identifier: "UsagePeriod" });

export type UsagePeriod = typeof UsagePeriodSchema.Type;

/**
 * What a workspace used against its plan, now and day by day (UTC). Counts
 * only: nothing here is priced or limits anything.
 */
export const WorkspaceUsageReportSchema = Schema.Struct({
  // The plan's limits; null on a server that does not bill.
  allowances: Schema.NullOr(PlanAllowancesSchema),
  // What each limit counts now, as the billing page shows it.
  current: UsageSchema,
  // Every day of the period, oldest first.
  days: Schema.Array(UsageDaySchema),
  period: UsagePeriodSchema,
  // Null on a server that does not bill.
  plan: Schema.NullOr(PlanSchema),
  // For a workspace a partner owns: its channels count against the plan
  // of the partner's home workspace. Null otherwise.
  sharedWith: Schema.NullOr(UsageSharingSchema),
  totals: UsageTotalsSchema,
}).annotate({ identifier: "WorkspaceUsageReport" });

export type WorkspaceUsageReport = typeof WorkspaceUsageReportSchema.Type;

/** What a workspace has used, against its plan and day by day. */
export class UsageApi extends HttpApiGroup.make("usage")
  .add(
    HttpApiEndpoint.get("get", "/", {
      error: [Forbidden, InvalidDateRange],
      params: { workspaceId: Schema.String },
      query: {
        from: Schema.optionalKey(CalendarDaySchema),
        to: Schema.optionalKey(CalendarDaySchema),
      },
      success: WorkspaceUsageReportSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Answers what the workspace uses of its plan now, and day by day from \`from\` to \`to\` (UTC days, both included, at most ${maxUsageRangeDays}; by default the ${defaultUsageRangeDays} days that end today): each day's posts that went out, one per channel they went out on, by platform, and its requests to the writing assistant; the channels it connected, its members and the media it stored as each day ended, null for a day the server took no snapshot of; then the period's totals, with its channel-days and, for each calendar month it touches, its posts on platforms that bill the server per post. Usage is kept ${usageRetentionDays} days. Counts only: nothing here is priced or limits anything. On a server that does not bill, \`plan\` and \`allowances\` are null. Needs billing:read.`,
        summary: "Get the workspace's usage",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/usage") {}
