import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  OpenApi,
} from "effect/http-api";

import { ArticleChangeRefused } from "./article-change-refused.ts";
import { ArticleNotFound } from "./article-not-found.ts";
import { ArticleRejected } from "./article-rejected.ts";
import { ArticleStateConflict } from "./article-state-conflict.ts";
import { ArticleStateNameSchema } from "./article-state-name.ts";
import { Authentication } from "./authentication.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { Forbidden } from "./forbidden.ts";
import { InvalidTimeZone } from "./invalid-time-zone.ts";
import { PlanLimitReached } from "./plan-limit-reached.ts";
import { PlatformUnreachable } from "./platform-unreachable.ts";
import { FailureReasonSchema, UnconfirmedReasonSchema } from "./posts.ts";
import { UnknownMedia } from "./unknown-media.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** The longest title an article takes. */
export const maxArticleTitleLength = 500;

/** The longest excerpt. */
export const maxArticleExcerptLength = 1000;

/** The most tags, and the most categories, an article names. */
export const maxArticleTerms = 20;

/** The longest name of a tag or a category. */
export const maxArticleTermLength = 200;

/** The most articles a page holds, and how many when not told. */
export const maxArticlePageSize = 100;

export const defaultArticlePageSize = 50;

/**
 * What the site makes of an article when Peal sends it: a post `publish`ed
 * at once, a `draft` to finish on the site, or a post scheduled on the
 * site (`future`), which the site publishes itself at the article's time;
 * Peal then sends it as soon as it is scheduled.
 */
export const ArticleSiteStatusSchema = Schema.Literals([
  "publish",
  "draft",
  "future",
]).annotate({
  description: "What the site makes of the article when Peal sends it.",
  identifier: "ArticleSiteStatus",
});

export type ArticleSiteStatus = typeof ArticleSiteStatusSchema.Type;

/**
 * An article's body: the document of the web app's rich-text editor, in
 * its JSON (a ProseMirror document). `content` holds its blocks, each with
 * a `type`: `paragraph` and `heading` (`attrs.level` 2, 3 or 4) of inline
 * `text` (with `marks`: `bold`, `italic`, `strike`, `code`, `link` with
 * `attrs.href` on http, https or mailto) and `hardBreak`; `bulletList` and
 * `orderedList` (`attrs.start`) of `listItem`s; `blockquote`;
 * `horizontalRule`; `codeBlock` of plain text; `image` with
 * `attrs.mediaId`, a file of the workspace's library, and `attrs.alt`.
 * Anything else is refused (ArticleRejected `bodyInvalid`); the server
 * writes the site's HTML from the document alone.
 */
export const ArticleBodySchema = Schema.Struct({
  content: Schema.Array(Schema.Unknown),
  type: Schema.Literal("doc"),
}).annotate({
  description:
    "The rich-text editor's document: blocks of paragraphs, headings, lists, quotes, rules, code and images.",
  identifier: "ArticleBody",
});

export type ArticleBody = typeof ArticleBodySchema.Type;

const termsSchema = Schema.Array(
  Schema.String.check(Schema.isMaxLength(maxArticleTermLength))
).check(Schema.isMaxLength(maxArticleTerms));

/** What an article says, and how it lands on the site. */
export const ArticleInputSchema = Schema.Struct({
  body: ArticleBodySchema,
  // Names, as the site shows them: found there whatever their case, or
  // made (a category by a user who may manage them).
  categories: Schema.optionalKey(termsSchema),
  // A file of the workspace's library: the post's featured image.
  coverMediaId: Schema.optionalKey(Schema.NullOr(Schema.String)),
  excerpt: Schema.optionalKey(
    Schema.NullOr(
      Schema.String.check(Schema.isMaxLength(maxArticleExcerptLength))
    )
  ),
  // `publish` unless told.
  siteStatus: Schema.optionalKey(ArticleSiteStatusSchema),
  tags: Schema.optionalKey(termsSchema),
  title: Schema.String.check(Schema.isMaxLength(maxArticleTitleLength)),
}).annotate({ identifier: "ArticleInput" });

export type ArticleInput = typeof ArticleInputSchema.Type;

/**
 * When an article goes out: at `at`, or now when it is left out, with the
 * IANA time zone it is scheduled in.
 */
export const ArticleTimeSchema = Schema.Struct({
  at: Schema.optionalKey(Schema.DateTimeUtc),
  timeZone: Schema.String,
}).annotate({ identifier: "ArticleTime" });

export type ArticleTime = typeof ArticleTimeSchema.Type;

/** A new article, for one of the workspace's websites. */
export const NewArticleSchema = Schema.Struct({
  ...ArticleInputSchema.fields,
  // The website's channel.
  channelId: Schema.String,
  // Scheduled at once when given; a draft otherwise.
  schedule: Schema.optionalKey(ArticleTimeSchema),
}).annotate({ identifier: "NewArticle" });

export type NewArticle = typeof NewArticleSchema.Type;

const scheduledFields = {
  scheduledAt: Schema.DateTimeUtc,
  timeZone: Schema.String,
};

/**
 * Where an article stands: a `draft`; `scheduled` (Peal sends it at
 * `scheduledAt`, or at once for a site that publishes it itself);
 * `publishing`; `published` on the site, under its id there
 * (`platformPostId`), `removedAt` once Peal moved it to the site's trash,
 * `editedAt` once Peal sent it again; `failed` and why; `unconfirmed`
 * when it may be on the site, which a member checks.
 */
export const ArticleStateSchema = Schema.Union([
  Schema.TaggedStruct("draft", {}),
  Schema.TaggedStruct("scheduled", scheduledFields),
  Schema.TaggedStruct("publishing", {
    ...scheduledFields,
    since: Schema.DateTimeUtc,
  }),
  Schema.TaggedStruct("published", {
    ...scheduledFields,
    editedAt: Schema.NullOr(Schema.DateTimeUtc),
    permalink: Schema.NullOr(Schema.String),
    platformPostId: Schema.String,
    publishedAt: Schema.DateTimeUtc,
    removedAt: Schema.NullOr(Schema.DateTimeUtc),
  }),
  Schema.TaggedStruct("failed", {
    ...scheduledFields,
    // The site's own code, for support.
    code: Schema.NullOr(Schema.String),
    failedAt: Schema.DateTimeUtc,
    reason: FailureReasonSchema,
  }),
  Schema.TaggedStruct("unconfirmed", {
    ...scheduledFields,
    attemptedAt: Schema.DateTimeUtc,
    reason: UnconfirmedReasonSchema,
  }),
]).annotate({ identifier: "ArticleState" });

export type ArticleState = typeof ArticleStateSchema.Type;

/** An article of the workspace. */
export const ArticleSchema = Schema.Struct({
  // The member who wrote it; null for an API key.
  authorId: Schema.NullOr(Schema.String),
  body: ArticleBodySchema,
  categories: Schema.Array(Schema.String),
  channelId: Schema.String,
  coverMediaId: Schema.NullOr(Schema.String),
  createdAt: Schema.DateTimeUtc,
  excerpt: Schema.NullOr(Schema.String),
  id: Schema.String,
  siteStatus: ArticleSiteStatusSchema,
  state: ArticleStateSchema,
  tags: Schema.Array(Schema.String),
  title: Schema.String,
  updatedAt: Schema.DateTimeUtc,
}).annotate({ identifier: "Article" });

export type Article = typeof ArticleSchema.Type;

/** A page of articles, newest first. */
export const ArticlePageSchema = Schema.Struct({
  items: Schema.Array(ArticleSchema),
  // Pass as `cursor` for the next page; null on the last.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "ArticlePage" });

export type ArticlePage = typeof ArticlePageSchema.Type;

const workspace = { workspaceId: Schema.String };

const article = { ...workspace, articleId: Schema.String };

const writeErrors = [
  Forbidden,
  PlanLimitReached,
  InvalidTimeZone,
  ArticleNotFound,
  ArticleRejected,
  ArticleStateConflict,
  ChannelNotFound,
  UnknownMedia,
] as const;

const siteErrors = [
  Forbidden,
  PlanLimitReached,
  ArticleNotFound,
  ArticleRejected,
  ArticleStateConflict,
  ArticleChangeRefused,
  UnknownMedia,
  PlatformUnreachable,
] as const;

/** A workspace's articles, for its websites. */
export class ArticlesApi extends HttpApiGroup.make("articles")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: [Forbidden, HttpApiError.BadRequest],
      params: workspace,
      query: {
        cursor: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxArticlePageSize, minimum: 1 })
          )
        ),
        status: Schema.optionalKey(ArticleStateNameSchema),
      },
      success: ArticlePageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspace's articles, newest first, ${defaultArticlePageSize} a page unless \`limit\` (at most ${maxArticlePageSize}) says otherwise, those in one \`status\` when it is given. Pass the page's \`nextCursor\` as \`cursor\` for the next. Needs post:read.`,
        summary: "List articles",
      })
    ),
    HttpApiEndpoint.get("get", "/:articleId", {
      error: [Forbidden, ArticleNotFound],
      params: article,
      success: ArticleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: "Reads an article. Needs post:read.",
        summary: "Get an article",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      error: writeErrors,
      params: workspace,
      payload: NewArticleSchema,
      success: ArticleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Writes an article for one of the workspace's websites (a channel connected with connectSite): a draft, or scheduled at once with `schedule`. A scheduled article is checked as the site would take it (ArticleRejected lists every violation); its images are files of the workspace's library, ready (UnknownMedia otherwise), the cover an image. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:create, and post:schedule with `schedule`.",
        summary: "Create an article",
      })
    ),
    HttpApiEndpoint.patch("update", "/:articleId", {
      error: writeErrors,
      params: article,
      payload: ArticleInputSchema,
      success: ArticleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Replaces what a draft, a scheduled article or one that failed says. A scheduled article is checked again and keeps its time; it is refused (ArticleRejected `approvalRequired`) while your posts need an approval. Once on the site, use updateOnSite. Needs post:update.",
        summary: "Update an article",
      })
    ),
    HttpApiEndpoint.delete("delete", "/:articleId", {
      error: [Forbidden, ArticleNotFound, ArticleStateConflict],
      params: article,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes the article from Peal, and its job when it waits to go out; never while it is being sent. A post already on the site stays there: unpublish it first. Needs post:delete.",
        summary: "Delete an article",
      })
    ),
    HttpApiEndpoint.post("schedule", "/:articleId/schedule", {
      error: writeErrors,
      params: article,
      payload: ArticleTimeSchema,
      success: ArticleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Schedules a draft, moves a scheduled article, or schedules one that failed again: Peal sends it at `at`, or now without it, and the site makes it what `siteStatus` says. With `future`, the site publishes it at `at`, which must be ahead, and Peal sends it at once. Everything is checked as the site would take it. What goes out is public, and cannot be taken back from Peal but by unpublishing it. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:schedule.",
        summary: "Schedule an article",
      })
    ),
    HttpApiEndpoint.post("unschedule", "/:articleId/unschedule", {
      error: [Forbidden, ArticleNotFound, ArticleStateConflict],
      params: article,
      success: ArticleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Takes a scheduled article back to draft: nothing is sent. Needs post:schedule.",
        summary: "Unschedule an article",
      })
    ),
    HttpApiEndpoint.post("retry", "/:articleId/retry", {
      error: writeErrors,
      params: article,
      success: ArticleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Sends a failed article again now, or one that was unconfirmed once a member checked it is not on the site: Peal never sends an unconfirmed article again on its own. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:schedule.",
        summary: "Send an article again",
      })
    ),
    HttpApiEndpoint.post("unpublish", "/:articleId/unpublish", {
      error: siteErrors,
      params: article,
      success: ArticleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Moves the article's post to the site's trash, where the site keeps it for a while (30 days by default on WordPress) before deleting it; it stays published in Peal, with `removedAt`. Needs post:publish; an OAuth client needs the scope workspace:publish.",
        summary: "Unpublish an article",
      })
    ),
    HttpApiEndpoint.post("updateOnSite", "/:articleId/site", {
      error: siteErrors,
      params: article,
      payload: ArticleInputSchema,
      success: ArticleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Replaces what the article's post says on the site (title, body, excerpt, tags, categories, cover), at once: the site keeps its status and its date, and files it has already are not sent again; a cover or an excerpt removed is removed there. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:publish; an OAuth client needs the scope workspace:publish.",
        summary: "Update an article on its site",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/articles") {}
