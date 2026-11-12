import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import {
  CalendarDaySchema,
  DashboardTotalsSchema,
  dashboardPeriods,
  FollowerChangeSchema,
} from "./analytics.ts";
import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { InvalidTimeRange } from "./invalid-time-range.ts";
import { InvalidTimeZone } from "./invalid-time-zone.ts";
import { PlatformSchema } from "./platform.ts";
import { PostStatusSchema } from "./post-status.ts";
import { Unauthenticated } from "./unauthenticated.ts";

/** The most workspaces a page across workspaces holds, and its default. */
export const maxOverviewPageSize = 50;

/** The most posts a page of the agenda holds. */
export const maxAgendaPageSize = 100;

/** How many posts a page of the agenda holds, unless `limit` says otherwise. */
export const defaultAgendaPageSize = 50;

/** The longest range the agenda lists, in days. */
export const maxAgendaDays = 31;

/** How many characters of a post's text the agenda shows. */
export const agendaExcerptLength = 140;

/**
 * Why a workspace shows no figure: it requires two-step verification, and
 * the person's account does not have it on (`twoStepRequired`).
 */
// One reason for now: a list of one would be written as a union of one.
export const OverviewRefusalSchema = Schema.Literal("twoStepRequired").annotate(
  { identifier: "OverviewRefusal" }
);

export type OverviewRefusal = typeof OverviewRefusalSchema.Type;

/**
 * A workspace's posts that need someone: going out in the next 7 days,
 * waiting for an approval, and finished in the last 7 days with a channel
 * that failed (the outcomes `failed` and `partiallyPublished`) or one that
 * may have it live and must be checked (`unconfirmed`). `mayApprove` says
 * whether the person may approve those that wait.
 */
export const OverviewPostsSchema = Schema.Struct({
  awaitingApproval: Schema.Int,
  failedLast7Days: Schema.Int,
  mayApprove: Schema.Boolean,
  scheduledNext7Days: Schema.Int,
  unconfirmedLast7Days: Schema.Int,
}).annotate({ identifier: "OverviewPosts" });

export type OverviewPosts = typeof OverviewPostsSchema.Type;

/** A workspace's channels, those to reconnect, and those turned off. */
export const OverviewChannelsSchema = Schema.Struct({
  connected: Schema.Int,
  off: Schema.Int,
  toReconnect: Schema.Int,
}).annotate({ identifier: "OverviewChannels" });

export type OverviewChannels = typeof OverviewChannelsSchema.Type;

/** The threads of a workspace's inbox with a comment waiting for an answer. */
export const OverviewInboxSchema = Schema.Struct({
  unanswered: Schema.Int,
}).annotate({ identifier: "OverviewInbox" });

export type OverviewInbox = typeof OverviewInboxSchema.Type;

/**
 * What needs attention in one workspace. A section is null where the
 * person's role there (or the application's scopes) may not read it,
 * which is not the same as nothing to show; every section is null where
 * the workspace refuses the person (`refused`).
 */
export const WorkspaceOverviewSchema = Schema.Struct({
  channels: Schema.NullOr(OverviewChannelsSchema),
  id: Schema.String,
  inbox: Schema.NullOr(OverviewInboxSchema),
  name: Schema.String,
  // The workspace holds more channels or members than its plan allows,
  // and schedules nothing until it comes back within it.
  overPlan: Schema.NullOr(Schema.Boolean),
  posts: Schema.NullOr(OverviewPostsSchema),
  refused: Schema.NullOr(OverviewRefusalSchema),
  role: Schema.String,
  slug: Schema.String,
}).annotate({ identifier: "WorkspaceOverview" });

export type WorkspaceOverview = typeof WorkspaceOverviewSchema.Type;

export const OverviewSchema = Schema.Struct({
  generatedAt: Schema.DateTimeUtc,
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
  workspaces: Schema.Array(WorkspaceOverviewSchema),
}).annotate({ identifier: "Overview" });

export type Overview = typeof OverviewSchema.Type;

/** One post of the agenda, light: never more of its text than an excerpt. */
export const AgendaItemSchema = Schema.Struct({
  // The first characters of its text, on one line.
  excerpt: Schema.String,
  // The platforms of its channels the workspace still has, once each;
  // null where the person may not read the workspace's channels.
  platforms: Schema.NullOr(Schema.Array(PlatformSchema)),
  postId: Schema.String,
  scheduledAt: Schema.DateTimeUtc,
  status: PostStatusSchema,
  // The IANA zone it was scheduled in.
  timeZone: Schema.String,
  workspaceId: Schema.String,
}).annotate({ identifier: "AgendaItem" });

export type AgendaItem = typeof AgendaItemSchema.Type;

export const AgendaPageSchema = Schema.Struct({
  items: Schema.Array(AgendaItemSchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "AgendaPage" });

export type AgendaPage = typeof AgendaPageSchema.Type;

/**
 * A workspace's analytics over the report's range beside the range before,
 * as its own dashboard answers them at its top: the totals of the posts
 * published in each (null where no platform of the workspace gives a
 * count, never zero), followers at the end of each and their change, and
 * whether the range before is still all kept.
 */
export const WorkspaceAnalyticsSchema = Schema.Struct({
  followers: FollowerChangeSchema,
  previousFollowers: FollowerChangeSchema,
  previousKept: Schema.Boolean,
  previousTotals: DashboardTotalsSchema,
  totals: DashboardTotalsSchema,
}).annotate({ identifier: "WorkspaceAnalytics" });

export type WorkspaceAnalytics = typeof WorkspaceAnalyticsSchema.Type;

/** One workspace of the report: null analytics where the role may not read them. */
export const WorkspaceReportSchema = Schema.Struct({
  analytics: Schema.NullOr(WorkspaceAnalyticsSchema),
  id: Schema.String,
  name: Schema.String,
  refused: Schema.NullOr(OverviewRefusalSchema),
  role: Schema.String,
  slug: Schema.String,
}).annotate({ identifier: "WorkspaceReport" });

export type WorkspaceReport = typeof WorkspaceReportSchema.Type;

export const ReportAcrossWorkspacesSchema = Schema.Struct({
  from: CalendarDaySchema,
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
  // The range before, of the same length, which a change compares with.
  previous: Schema.Struct({ from: CalendarDaySchema, to: CalendarDaySchema }),
  timeZone: Schema.String,
  to: CalendarDaySchema,
  workspaces: Schema.Array(WorkspaceReportSchema),
}).annotate({ identifier: "ReportAcrossWorkspaces" });

export type ReportAcrossWorkspaces = typeof ReportAcrossWorkspacesSchema.Type;

/** The report's days unless `days` says otherwise. */
export const defaultReportDays = 30;

/** The columns of the report's CSV, one line a workspace, in this order. */
export const reportColumns = [
  "workspaceId",
  "workspace",
  "from",
  "to",
  "posts",
  "likes",
  "reposts",
  "replies",
  "quotes",
  "impressions",
  "clicks",
  "reach",
  "saves",
  "engagement",
  "followers",
  "followersGained",
  "previousKept",
  "previousPosts",
  "previousLikes",
  "previousReposts",
  "previousReplies",
  "previousQuotes",
  "previousImpressions",
  "previousClicks",
  "previousReach",
  "previousSaves",
  "previousEngagement",
  "previousFollowers",
  "previousFollowersGained",
] as const;

const reportQuery = {
  days: Schema.optionalKey(
    Schema.NumberFromString.pipe(
      Schema.decodeTo(Schema.Literals(dashboardPeriods))
    )
  ),
  timeZone: Schema.String,
};

const reportRange = `The range is \`days\` (7, 30 or 90, ${String(defaultReportDays)} unless given: that many days ending today in \`timeZone\`, an IANA zone such as Europe/Paris), beside the range before, of the same length.`;

const refusals =
  "API keys belong to a workspace, not to anyone, and get 403, as do OAuth tokens bound to one workspace; the command line's token, bound to none, reads every workspace with what its scopes allow there.";

/**
 * What a person reads across the workspaces they belong to: what needs
 * attention in each, and one agenda of what goes out. Each workspace shows
 * only what the person's role there may read.
 */
export class OverviewApi extends HttpApiGroup.make("overview")
  .add(
    HttpApiEndpoint.get("get", "/overview", {
      error: [Forbidden, Unauthenticated, HttpApiError.BadRequest],
      query: {
        cursor: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxOverviewPageSize, minimum: 1 })
          )
        ),
      },
      success: OverviewSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Answers what needs attention in each workspace the user belongs to, ${maxOverviewPageSize} a page at most, by name then id: the posts going out in the next 7 days, those waiting for an approval (and whether the user may approve them), those that finished in the last 7 days with a channel that failed or that must be checked; the channels connected, to reconnect and turned off; the inbox's threads waiting for an answer; and whether the workspace is over its plan. Each section is given only where the user's role in that workspace may read it, with the permission its own page takes (\`post:read\`, \`channel:read\`, \`engagement:read\`), and is null otherwise, never zero; a workspace that refuses the user, as one that requires two-step verification while the account does not have it on, is listed with its name, \`refused\`, and no figure at all. Pass the page's \`nextCursor\` as \`cursor\` for the next one; a cursor no page gave is a bad request. ${refusals}`,
        summary: "Get what needs attention across workspaces",
      })
    ),
    HttpApiEndpoint.get("agenda", "/agenda", {
      error: [
        Forbidden,
        Unauthenticated,
        InvalidTimeRange,
        HttpApiError.BadRequest,
      ],
      query: {
        cursor: Schema.optionalKey(Schema.String),
        from: Schema.DateTimeUtc,
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxAgendaPageSize, minimum: 1 })
          )
        ),
        to: Schema.DateTimeUtc,
        workspaceIds: Schema.optionalKey(Schema.String),
      },
      success: AgendaPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the posts with a time from \`from\` (included) to \`to\` (excluded), at most ${maxAgendaDays} days apart (InvalidTimeRange otherwise), across the workspaces where the user may read posts (\`post:read\`), or only those of them that \`workspaceIds\` names (comma-separated ids). Posts waiting for an approval, scheduled, publishing and finished are listed; drafts and cancelled posts are not. They come by time, then id, ${defaultAgendaPageSize} a page unless \`limit\` (at most ${maxAgendaPageSize}) says otherwise; pass the page's \`nextCursor\` as \`cursor\`, with the same query, for the next one. Each post is light: its workspace, its time and zone, its status, its platforms (null where the user may not read the workspace's channels) and the first ${agendaExcerptLength} characters of its text. ${refusals}`,
        summary: "List the agenda across workspaces",
      })
    ),
    HttpApiEndpoint.get("report", "/report", {
      error: [
        Forbidden,
        Unauthenticated,
        InvalidTimeZone,
        HttpApiError.BadRequest,
      ],
      query: {
        ...reportQuery,
        cursor: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxOverviewPageSize, minimum: 1 })
          )
        ),
      },
      success: ReportAcrossWorkspacesSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Answers what went out in each workspace the user belongs to and how it did, ${maxOverviewPageSize} workspaces a page at most, by name then id: each workspace's totals of the posts published in the range (likes, reposts, replies, quotes, impressions, clicks, reach, saves; null where no platform of the workspace gives one, never zero), followers and their change, and the same for the range before with \`previousKept\` (false where a platform's terms keep less than the range before goes back: show no change then), as that workspace's own dashboard answers them. ${reportRange} \`analytics\` is null where the user's role may not read the workspace's analytics (\`analytics:read\`), and in a workspace that refuses the user (\`refused\`). Figures of different platforms are not alike: compare a workspace with itself, not with another. Pass the page's \`nextCursor\` as \`cursor\` for the next one. ${refusals}`,
        summary: "Get a report across workspaces",
      })
    ),
    HttpApiEndpoint.get("reportExport", "/report/export", {
      error: [Forbidden, Unauthenticated, InvalidTimeZone],
      query: reportQuery,
      success: HttpApiSchema.StreamUint8Array({ contentType: "text/csv" }),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Streams the report across workspaces as a CSV file, RFC 4180: a header line, then one line a workspace the user belongs to, by name then id, with the columns ${reportColumns.map((column) => `\`${column}\``).join(", ")}. A count no platform gives, a workspace whose analytics the user may not read, and the range before where \`previousKept\` is false, are empty cells; a cell that would start a formula in a spreadsheet starts with an apostrophe. ${reportRange} ${refusals}`,
        summary: "Export the report across workspaces",
      })
    )
  )
  .middleware(Authentication)
  .prefix("/api/me") {}
