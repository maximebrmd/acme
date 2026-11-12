import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  OpenApi,
} from "effect/http-api";

import { CalendarDaySchema } from "./analytics.ts";
import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { InvalidDateRange } from "./invalid-date-range.ts";
import { ShortLinkNotFound } from "./short-link-not-found.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** How many days one read of clicks covers at most, both ends included. */
export const maxShortLinkRangeDays = 92;

/** How many days a read covers when not told, ending today (UTC). */
export const defaultShortLinkRangeDays = 30;

/** How many days the server keeps a short link's clicks, day by day. */
export const shortLinkClickRetentionDays = 400;

/** How many links a page holds, unless `limit` says otherwise. */
export const defaultShortLinkPageSize = 50;

/** The most links a page holds. */
export const maxShortLinkPageSize = 100;

/** Whether this server shortens links, and what the workspace chose. */
export const ShortLinkStatusSchema = Schema.Struct({
  // Whether the server has short links: off unless its operator set
  // where they live.
  available: Schema.Boolean,
  // What every short address starts with; null when not available.
  base: Schema.NullOr(Schema.String),
  // Whether new posts ask for short links unless their author says not.
  byDefault: Schema.Boolean,
  // How long a short address is, in UTF-16 code units: only a link longer
  // than this is replaced. Null when not available.
  shortLength: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "ShortLinkStatus" });

export type ShortLinkStatus = typeof ShortLinkStatusSchema.Type;

/** The workspace's default for new posts. */
export const ShortLinkSettingsSchema = Schema.Struct({
  byDefault: Schema.Boolean,
}).annotate({ identifier: "ShortLinkSettings" });

export type ShortLinkSettings = typeof ShortLinkSettingsSchema.Type;

/** The days clicks were counted over, both included (UTC). */
export const ShortLinkPeriodSchema = Schema.Struct({
  from: CalendarDaySchema,
  to: CalendarDaySchema,
}).annotate({ identifier: "ShortLinkPeriod" });

/**
 * A short address a post went out with, on one channel, and how many
 * counted visits it had over the period: an approximate count, automated
 * readers left out by their names, nothing kept of the visitors.
 */
export const ShortLinkSchema = Schema.Struct({
  channelId: Schema.String,
  // The clicks counted over the period asked.
  clicks: Schema.Int,
  createdAt: Schema.DateTimeUtc,
  // Where it leads: the address the post's text held.
  destination: Schema.String,
  // Turned off by the server's staff: it answers 410.
  disabled: Schema.Boolean,
  id: Schema.String,
  // The part of the post it is in: 0 for the post, then its thread's.
  part: Schema.Int,
  postId: Schema.String,
  // Its address, on this server's base; null once the server has none.
  shortUrl: Schema.NullOr(Schema.String),
  targetId: Schema.String,
}).annotate({ identifier: "ShortLink" });

export type ShortLink = typeof ShortLinkSchema.Type;

export const ShortLinkPageSchema = Schema.Struct({
  items: Schema.Array(ShortLinkSchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
  period: ShortLinkPeriodSchema,
}).annotate({ identifier: "ShortLinkPage" });

export type ShortLinkPage = typeof ShortLinkPageSchema.Type;

/** A day's clicks of one short link. */
export const ShortLinkDaySchema = Schema.Struct({
  clicks: Schema.Int,
  day: CalendarDaySchema,
}).annotate({ identifier: "ShortLinkDay" });

/** One short link, with its clicks each day of the period, oldest first. */
export const ShortLinkReportSchema = Schema.Struct({
  days: Schema.Array(ShortLinkDaySchema),
  link: ShortLinkSchema,
  period: ShortLinkPeriodSchema,
}).annotate({ identifier: "ShortLinkReport" });

export type ShortLinkReport = typeof ShortLinkReportSchema.Type;

const counted = `Clicks are counted by UTC day and kept ${shortLinkClickRetentionDays} days; a request from an automated reader (a crawler, a link preview), a prefetch or a HEAD is redirected but not counted, so the figure is approximate, and nothing about the visitor is kept.`;

const period = `from \`from\` to \`to\` (UTC days, both included, at most ${maxShortLinkRangeDays}; by default the ${defaultShortLinkRangeDays} days that end today)`;

/**
 * The short links a workspace's posts went out with, and their clicks.
 * Off on a server whose operator set no base for them.
 */
export class ShortLinksApi extends HttpApiGroup.make("shortLinks")
  .add(
    HttpApiEndpoint.get("status", "/status", {
      error: [Forbidden],
      params: { workspaceId: Schema.String },
      success: ShortLinkStatusSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers whether this server shortens links (`available`), what a short address starts with (`base`) and how long it is (`shortLength`), and whether the workspace's new posts ask for short links by default (`byDefault`). A post that asks (`shortenLinks`) goes out with each link written with `http://` or `https://` and longer than a short address replaced by one, one per channel and link, which redirects to it and counts the visit; the text kept stays as written, and Pinterest, Instagram and TikTok always get links as written, as does a link to a channel's own platform. Needs post:read.",
        summary: "Get the short links' status",
      })
    )
  )
  .add(
    HttpApiEndpoint.put("setDefault", "/settings", {
      error: [Forbidden],
      params: { workspaceId: Schema.String },
      payload: ShortLinkSettingsSchema,
      success: ShortLinkStatusSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Sets whether the workspace's new posts ask for short links unless their author says otherwise; each post still chooses for itself. Needs organization:update, which owners and admins hold.",
        summary: "Set the short links' default",
      })
    )
  )
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: [Forbidden, HttpApiError.BadRequest, InvalidDateRange],
      params: { workspaceId: Schema.String },
      query: {
        channelId: Schema.optionalKey(Schema.String),
        cursor: Schema.optionalKey(Schema.String),
        from: Schema.optionalKey(CalendarDaySchema),
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxShortLinkPageSize, minimum: 1 })
          )
        ),
        postId: Schema.optionalKey(Schema.String),
        to: Schema.optionalKey(CalendarDaySchema),
      },
      success: ShortLinkPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspace's short links, newest first, ${defaultShortLinkPageSize} a page unless \`limit\` (at most ${maxShortLinkPageSize}) says otherwise, those of one post (\`postId\`) or one channel (\`channelId\`), each with its clicks ${period}. Pass the page's \`nextCursor\` as \`cursor\` for the next one. ${counted} Needs analytics:read.`,
        summary: "List the short links",
      })
    )
  )
  .add(
    HttpApiEndpoint.get("get", "/:linkId", {
      error: [Forbidden, InvalidDateRange, ShortLinkNotFound],
      params: { linkId: Schema.String, workspaceId: Schema.String },
      query: {
        from: Schema.optionalKey(CalendarDaySchema),
        to: Schema.optionalKey(CalendarDaySchema),
      },
      success: ShortLinkReportSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Answers one short link with its clicks each day ${period}, oldest first. ${counted} Needs analytics:read.`,
        summary: "Get a short link",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/short-links") {}
