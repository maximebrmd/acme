import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  OpenApi,
} from "effect/http-api";

import { CalendarDaySchema } from "./analytics.ts";
import { Authentication } from "./authentication.ts";
import { PlanSchema } from "./billing-plans.ts";
import { PlanAllowancesSchema, UsageSchema } from "./billing.ts";
import { Forbidden } from "./forbidden.ts";
import { ByteCountSchema, Int64Schema } from "./int64.ts";
import { InvalidDateRange } from "./invalid-date-range.ts";
import { PartnerNotFound } from "./partner-not-found.ts";
import { defaultWorkspacePageSize, maxWorkspacePageSize } from "./partner.ts";
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

/**
 * One workspace of a partner's usage report: its home workspace, or a
 * workspace it owns for one of its customers, and what it used over the
 * period.
 */
export const TenantUsageSchema = Schema.Struct({
  // The requests sent to the writing assistant over the period, as the
  // daily snapshots copied them.
  assistantRequests: Schema.Int,
  byPlatform: Schema.Array(PlatformPostsSchema),
  // The period's days' `channels` added up, the days without a snapshot
  // left out.
  channelDays: Int64Schema,
  // The channels the workspace itself has connected now.
  channels: Schema.Int,
  // How many days `channelDays` counts.
  daysCounted: Schema.Int,
  // The partner's own id for its customer; null for the home workspace
  // and a workspace given none.
  externalId: Schema.NullOr(Schema.String),
  // Whether this is the partner's home workspace, whose plan the others
  // share.
  home: Schema.Boolean,
  // Bytes of media stored, as the period's latest snapshot found them;
  // null when no day of the period has one.
  mediaStorage: Schema.NullOr(ByteCountSchema),
  // Each calendar month (UTC) the period touches, whole, on each platform
  // that bills the server per post.
  meteredPosts: Schema.Array(MeteredPostsSchema),
  name: Schema.String,
  // The posts that went out over the period, one per channel.
  publishedPosts: Schema.Int,
  workspaceId: Schema.String,
}).annotate({ identifier: "TenantUsage" });

export type TenantUsage = typeof TenantUsageSchema.Type;

/** A page of a partner's workspaces and what each used. */
export const TenantUsagePageSchema = Schema.Struct({
  // What to pass as `before` for the next page; null on the last one.
  next: Schema.NullOr(Schema.String),
  // How many workspaces the partner owns, its home workspace left out.
  total: Schema.Int,
  // Newest first, as the list of the partner's workspaces orders them;
  // the home workspace comes first, on the first page only.
  workspaces: Schema.Array(TenantUsageSchema),
}).annotate({ identifier: "TenantUsagePage" });

export type TenantUsagePage = typeof TenantUsagePageSchema.Type;

/** A day (UTC) of a partner's usage, across the workspaces it holds. */
export const PartnerUsageReportDaySchema = Schema.Struct({
  // The day's posts by platform, in the workspaces that still exist.
  byPlatform: Schema.Array(PlatformPostsSchema),
  // The channels connected across the partner's home workspace and every
  // workspace it owned at the end of the day; null for a day the server
  // kept no count of.
  channels: Schema.NullOr(Schema.Int),
  day: CalendarDaySchema,
  // The posts that went out that day, one per channel, in the workspaces
  // that still exist.
  publishedPosts: Schema.Int,
  // The workspaces the partner owned at the end of the day, those
  // offboarded since included; null for a day without a count.
  workspaces: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "PartnerUsageReportDay" });

export type PartnerUsageReportDay = typeof PartnerUsageReportDaySchema.Type;

/** What a partner holds now. */
export const PartnerHoldingsSchema = Schema.Struct({
  // The channels connected across its home workspace and every workspace
  // it owns, which its plan's channel limit counts.
  channels: Schema.Int,
  // The workspaces it owns, its home left out.
  workspaces: Schema.Int,
}).annotate({ identifier: "PartnerHoldings" });

export type PartnerHoldings = typeof PartnerHoldingsSchema.Type;

/**
 * What a partner account used across the workspaces it holds, day by day
 * (UTC), and per workspace, with each customer's external id. Counts only:
 * nothing here is priced or limits anything.
 */
export const PartnerUsageReportSchema = Schema.Struct({
  // The home workspace's plan's limits; null on a server that does not
  // bill.
  allowances: Schema.NullOr(PlanAllowancesSchema),
  current: PartnerHoldingsSchema,
  // Every day of the period, oldest first.
  days: Schema.Array(PartnerUsageReportDaySchema),
  period: UsagePeriodSchema,
  // The home workspace's plan; null on a server that does not bill.
  plan: Schema.NullOr(PlanSchema),
  // The period's usage across every workspace that still exists, with
  // `channelDays` from the partner's daily counts.
  totals: UsageTotalsSchema,
  workspaces: TenantUsagePageSchema,
}).annotate({ identifier: "PartnerUsageReport" });

export type PartnerUsageReport = typeof PartnerUsageReportSchema.Type;

/** The period and the page of a partner's usage report. */
export const partnerUsageQuery = {
  before: Schema.optionalKey(Schema.String),
  from: Schema.optionalKey(CalendarDaySchema),
  limit: Schema.optionalKey(
    Schema.Int.check(
      Schema.isBetween({ maximum: maxWorkspacePageSize, minimum: 1 })
    )
  ),
  to: Schema.optionalKey(CalendarDaySchema),
};

/** What both copies of the partner's report answer. */
export const partnerUsageDescription = `Answers what the partner account uses across the workspaces it holds, from \`from\` to \`to\` (UTC days, both included, at most ${maxUsageRangeDays}; by default the ${defaultUsageRangeDays} days that end today), and per workspace. \`current\` is what it holds now: the workspaces it owns and the channels connected across them and its home workspace, which its plan's channel limit counts. Each day gives the workspaces it owned and the channels connected across them as the daily count found them at 23:41 UTC (null for a day without a count), and the posts that went out in the workspaces that still exist. \`workspaces\` is a page of its workspaces with each one's external id, the channels it connected itself now, and over the period its channel-days, posts by platform, requests to the writing assistant, latest media storage and, for each calendar month the period touches, posts on platforms that bill the server per post: newest first, ${defaultWorkspacePageSize} a page unless \`limit\` (at most ${maxWorkspacePageSize}) says otherwise, in the order and with the cursor of the list of the partner's workspaces (pass \`next\` as \`before\`; anything else is refused, 400); the home workspace comes first, on the first page only, one more than asked. A workspace offboarded during the period is no longer listed, and its posts leave the sums, as its counts were erased with it; the daily \`workspaces\` and \`channels\` still count it for the days it existed. Kept ${usageRetentionDays} days. Counts only: nothing here is priced or limits anything. On a server that does not bill, \`plan\` and \`allowances\` are null.`;

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
        description: `Answers what the workspace uses of its plan now, and day by day from \`from\` to \`to\` (UTC days, both included, at most ${maxUsageRangeDays}; by default the ${defaultUsageRangeDays} days that end today): each day's posts that went out, one per channel they went out on, by platform, and its requests to the writing assistant; the channels it connected, its members and the media it stored as the daily snapshot found them shortly after each day ended, null (requests included) for a day the server took no snapshot of, today's among them; then the period's totals, with its channel-days and, for each calendar month it touches, its posts on platforms that bill the server per post, each part of a thread counted as the platform bills it (a thread is one of the day's posts). Usage is kept ${usageRetentionDays} days. Counts only: nothing here is priced or limits anything. On a server that does not bill, \`plan\` and \`allowances\` are null. Needs billing:read.`,
        summary: "Get the workspace's usage",
      })
    ),
    HttpApiEndpoint.get("partner", "/partner", {
      error: [
        Forbidden,
        PartnerNotFound,
        InvalidDateRange,
        HttpApiError.BadRequest,
      ],
      params: { workspaceId: Schema.String },
      query: partnerUsageQuery,
      success: PartnerUsageReportSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `${partnerUsageDescription} For the people of the partner's home workspace: a workspace with no partner account answers 404 \`PartnerNotFound\`. A partner key reads the same at \`GET /api/partner/usage\`. Needs partner:read.`,
        summary: "Get the partner account's usage per customer",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/usage") {}
