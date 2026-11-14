import { DateTime, Duration, Match, Option, Result, Schema } from "effect";

import {
  ChannelIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";
import {
  PlatformPostIdSchema,
  UnconfirmedReasonSchema,
} from "#shared/domain/publish-result.ts";

import { bodyMediaOf, bodyTextLength } from "./article-body.ts";
import { ArticleContent } from "./article-content.ts";
import { ArticleIdSchema } from "./article-id.ts";
import { InvalidArticleTransition } from "./invalid-article-transition.ts";
import type {
  ArticleAction,
  ArticleStateName,
} from "./invalid-article-transition.ts";
import { FailureReasonSchema } from "./post-target-status.ts";
import { Schedule } from "./schedule.ts";
import type { TargetSettlement } from "./target-settlement.ts";

/** The longest title an article takes. */
export const maxArticleTitleLength = 500;

/** The longest excerpt. */
export const maxExcerptLength = 1000;

/** The most tags, and the most categories, an article names. */
export const maxArticleTerms = 20;

/** The longest name of a tag or a category (WordPress keeps 200). */
export const maxTermLength = 200;

/**
 * Where an article stands:
 *
 * - `draft`: in Peal only.
 * - `scheduled`: Peal sends it at its time, or at once for a site that
 *   publishes it itself (`future`).
 * - `publishing`: being sent.
 * - `published`: the site has it, under its id there; `removedAt` once
 *   Peal moved it to the site's trash, `editedAt` once Peal sent it
 *   again.
 * - `failed`: the site refused it, or could not be reached; nothing is
 *   there.
 * - `unconfirmed`: it may be on the site: Peal never sends it again on
 *   its own, a member checks.
 *
 * Stored as JSON: members and fields may be added, never renamed.
 */
export const ArticleStateSchema = Schema.Union([
  Schema.TaggedStruct("draft", {}),
  Schema.TaggedStruct("scheduled", { schedule: Schedule }),
  Schema.TaggedStruct("publishing", {
    schedule: Schedule,
    since: Schema.DateTimeUtc,
  }),
  Schema.TaggedStruct("published", {
    editedAt: Schema.optionalKey(Schema.DateTimeUtc),
    permalink: Schema.optionalKey(Schema.String),
    platformPostId: PlatformPostIdSchema,
    publishedAt: Schema.DateTimeUtc,
    removedAt: Schema.optionalKey(Schema.DateTimeUtc),
    schedule: Schedule,
  }),
  Schema.TaggedStruct("failed", {
    code: Schema.optionalKey(Schema.String),
    failedAt: Schema.DateTimeUtc,
    reason: FailureReasonSchema,
    schedule: Schedule,
  }),
  Schema.TaggedStruct("unconfirmed", {
    attemptedAt: Schema.DateTimeUtc,
    reason: UnconfirmedReasonSchema,
    schedule: Schedule,
  }),
]);

export type ArticleState = typeof ArticleStateSchema.Type;

/**
 * An article of a workspace, for one of its websites (a channel of a
 * site's platform). `revision` changes with every schedule, so a job
 * started for an earlier one finds itself superseded; `round` counts the
 * times it was sent again after failing.
 */
export class Article extends Schema.Class<Article>(
  "peal-server/publishing/domain/Article"
)({
  authorId: Schema.Option(UserIdSchema),
  channelId: ChannelIdSchema,
  content: ArticleContent,
  createdAt: Schema.DateTimeUtc,
  id: ArticleIdSchema,
  revision: Schema.Int,
  round: Schema.Int,
  state: ArticleStateSchema,
  updatedAt: Schema.DateTimeUtc,
  workspaceId: WorkspaceIdSchema,
}) {}

/** How late an article may still go out, as after the server was down. */
export const articleLatenessLimit = Duration.hours(1);

/** What a site will not take of an article, found before it is sent. */
export type ArticleViolation =
  | { readonly _tag: "titleMissing" }
  | { readonly _tag: "titleTooLong"; readonly maximum: number }
  | { readonly _tag: "bodyMissing" }
  | { readonly _tag: "excerptTooLong"; readonly maximum: number }
  | {
      readonly _tag: "tooManyTerms";
      readonly field: "categories" | "tags";
      readonly maximum: number;
    }
  | {
      readonly _tag: "termInvalid";
      readonly field: "categories" | "tags";
    }
  | { readonly _tag: "siteTimeInPast" };

const termViolations = (
  field: "categories" | "tags",
  names: readonly string[]
): readonly ArticleViolation[] => [
  ...(names.length > maxArticleTerms
    ? [{ _tag: "tooManyTerms", field, maximum: maxArticleTerms } as const]
    : []),
  ...(names.some((name) => name.trim() === "" || name.length > maxTermLength)
    ? [{ _tag: "termInvalid", field } as const]
    : []),
];

/**
 * What would keep the article from going out at `schedule`: checked when
 * it is scheduled, never while it is a draft.
 */
export const articleViolations = (
  content: ArticleContent,
  schedule: Schedule,
  now: DateTime.Utc
): readonly ArticleViolation[] => {
  const title = content.title.trim();
  const excerpt = Option.getOrElse(content.excerpt, () => "");

  return [
    ...(title === "" ? [{ _tag: "titleMissing" } as const] : []),
    ...(content.title.length > maxArticleTitleLength
      ? [{ _tag: "titleTooLong", maximum: maxArticleTitleLength } as const]
      : []),
    ...(bodyTextLength(content.body) === 0 &&
    bodyMediaOf(content.body).length === 0
      ? [{ _tag: "bodyMissing" } as const]
      : []),
    ...(excerpt.length > maxExcerptLength
      ? [{ _tag: "excerptTooLong", maximum: maxExcerptLength } as const]
      : []),
    ...termViolations("tags", content.tags),
    ...termViolations("categories", content.categories),
    // The site publishes it itself: its time must be ahead.
    ...(content.siteStatus === "future" &&
    !DateTime.isGreaterThan(schedule.at, now)
      ? [{ _tag: "siteTimeInPast" } as const]
      : []),
  ];
};

/** Every file of the library the article shows: its cover, then its body's. */
export const articleMediaOf = (
  content: ArticleContent
): readonly MediaAssetId[] => {
  const cover = Option.toArray(content.coverMediaId);

  return [
    ...cover,
    ...bodyMediaOf(content.body).filter((id) => !cover.includes(id)),
  ];
};

/**
 * When Peal sends the article: at its time, or at once when the site
 * publishes it itself at that time.
 */
export const sendAt = (article: Article, now: DateTime.Utc): DateTime.Utc => {
  const { state } = article;

  if (state._tag !== "scheduled") {
    return now;
  }

  return article.content.siteStatus === "future" ? now : state.schedule.at;
};

const refused = (
  article: Article,
  action: ArticleAction
): Result.Result<never, InvalidArticleTransition> =>
  Result.fail(
    new InvalidArticleTransition({
      action,
      articleId: article.id,
      from: article.state._tag satisfies ArticleStateName,
    })
  );

// The article with what changed, at `now`.
const changed = (
  article: Article,
  now: DateTime.Utc,
  change: {
    readonly content?: ArticleContent;
    readonly revision?: number;
    readonly round?: number;
    readonly state?: ArticleState;
  }
): Article =>
  new Article({
    authorId: article.authorId,
    channelId: article.channelId,
    content: change.content ?? article.content,
    createdAt: article.createdAt,
    id: article.id,
    revision: change.revision ?? article.revision,
    round: change.round ?? article.round,
    state: change.state ?? article.state,
    updatedAt: now,
    workspaceId: article.workspaceId,
  });

const withState = (
  article: Article,
  state: ArticleState,
  now: DateTime.Utc,
  change: { readonly revision?: number; readonly round?: number } = {}
): Article => changed(article, now, { ...change, state });

/** A new article, as a draft. */
export const newArticle = (
  fields: Pick<
    Article,
    "authorId" | "channelId" | "content" | "id" | "workspaceId"
  >,
  now: DateTime.Utc
): Article =>
  new Article({
    authorId: fields.authorId,
    channelId: fields.channelId,
    content: fields.content,
    createdAt: now,
    id: fields.id,
    workspaceId: fields.workspaceId,
    revision: 0,
    round: 0,
    state: { _tag: "draft" },
    updatedAt: now,
  });

/**
 * The article says something else. A draft, a scheduled article (whose
 * job then starts again, under a new revision) and one that failed take
 * it; one that is being sent, is on the site or may be does not.
 */
export const edited = (
  article: Article,
  content: ArticleContent,
  now: DateTime.Utc
): Result.Result<Article, InvalidArticleTransition> => {
  const { state } = article;

  if (
    state._tag !== "draft" &&
    state._tag !== "scheduled" &&
    state._tag !== "failed"
  ) {
    return refused(article, "edit");
  }

  return Result.succeed(
    changed(article, now, {
      content,
      revision:
        state._tag === "scheduled" ? article.revision + 1 : article.revision,
    })
  );
};

/** The article goes out at `schedule`: a draft, or one scheduled or failed. */
export const scheduled = (
  article: Article,
  schedule: Schedule,
  now: DateTime.Utc
): Result.Result<Article, InvalidArticleTransition> => {
  const { _tag } = article.state;

  return _tag === "draft" || _tag === "scheduled" || _tag === "failed"
    ? Result.succeed(
        withState(article, { _tag: "scheduled", schedule }, now, {
          revision: article.revision + 1,
          round: 0,
        })
      )
    : refused(article, "schedule");
};

/** A scheduled article back to draft: its job finds itself superseded. */
export const unscheduled = (
  article: Article,
  now: DateTime.Utc
): Result.Result<Article, InvalidArticleTransition> =>
  article.state._tag === "scheduled"
    ? Result.succeed(
        withState(article, { _tag: "draft" }, now, {
          revision: article.revision + 1,
        })
      )
    : refused(article, "unschedule");

/** What a job finds when it comes to send the article. */
export type ArticleClaim =
  | { readonly _tag: "claimed"; readonly article: Article }
  | { readonly _tag: "missed"; readonly article: Article }
  | { readonly _tag: "superseded" };

/**
 * The job of `revision` and `round` takes the article to send it: only
 * the job of its current revision and round, while it is scheduled, and
 * not more than `articleLatenessLimit` after Peal was due to send it.
 */
export const claimed = (
  article: Article,
  job: { readonly revision: number; readonly round: number },
  dueAt: DateTime.Utc,
  now: DateTime.Utc
): ArticleClaim => {
  const { state } = article;

  if (
    state._tag !== "scheduled" ||
    article.revision !== job.revision ||
    article.round !== job.round
  ) {
    return { _tag: "superseded" };
  }

  if (
    Duration.isGreaterThan(DateTime.distance(dueAt, now), articleLatenessLimit)
  ) {
    return {
      _tag: "missed",
      article: withState(
        article,
        {
          _tag: "failed",
          failedAt: now,
          reason: "missed",
          schedule: state.schedule,
        },
        now
      ),
    };
  }

  return {
    _tag: "claimed",
    article: withState(
      article,
      { _tag: "publishing", schedule: state.schedule, since: now },
      now
    ),
  };
};

/** How an article that was being sent ended, once nothing is left to try. */
export const settled = (
  article: Article,
  settlement: TargetSettlement,
  now: DateTime.Utc
): Article => {
  const { state } = article;

  if (state._tag !== "publishing") {
    return article;
  }

  const { schedule } = state;

  const next: ArticleState = Match.valueTags(settlement, {
    cancelled: (): ArticleState => ({ _tag: "draft" }),
    failed: ({ code, reason }): ArticleState =>
      code === undefined
        ? { _tag: "failed", failedAt: now, reason, schedule }
        : { _tag: "failed", code, failedAt: now, reason, schedule },
    published: ({ permalink, platformPostId }): ArticleState =>
      permalink === undefined
        ? { _tag: "published", platformPostId, publishedAt: now, schedule }
        : {
            _tag: "published",
            permalink,
            platformPostId,
            publishedAt: now,
            schedule,
          },
    unconfirmed: ({ attemptedAt, reason }): ArticleState => ({
      _tag: "unconfirmed",
      attemptedAt: attemptedAt ?? state.since,
      reason,
      schedule,
    }),
  });

  return withState(article, next, now);
};

/**
 * A failed article, or one a member checked was not on the site, sent
 * again now, in a round of its own.
 */
export const retried = (
  article: Article,
  now: DateTime.Utc
): Result.Result<Article, InvalidArticleTransition> => {
  const { state } = article;

  if (state._tag !== "failed" && state._tag !== "unconfirmed") {
    return refused(article, "retry");
  }

  return Result.succeed(
    withState(
      article,
      {
        _tag: "scheduled",
        schedule: new Schedule({ at: now, timeZone: state.schedule.timeZone }),
      },
      now,
      { round: article.round + 1 }
    )
  );
};

/** The id the site gave the article, while Peal can still change it there. */
export const livePostOf = (
  article: Article,
  action: "unpublish" | "updateOnSite"
): Result.Result<
  Extract<ArticleState, { readonly _tag: "published" }>,
  InvalidArticleTransition
> => {
  const { state } = article;

  return state._tag === "published" && state.removedAt === undefined
    ? Result.succeed(state)
    : refused(article, action);
};

/** The site moved the article to its trash: it stays published, removed. */
export const removedFromSite = (
  article: Article,
  now: DateTime.Utc
): Article => {
  const { state } = article;

  return state._tag === "published"
    ? withState(article, { ...state, removedAt: now }, now)
    : article;
};

/** The site took the article's new content. */
export const updatedOnSite = (
  article: Article,
  content: ArticleContent,
  now: DateTime.Utc
): Article => {
  const { state } = article;

  return state._tag === "published"
    ? changed(article, now, { content, state: { ...state, editedAt: now } })
    : article;
};

/** Whether the article may be deleted from Peal: not while it is sent. */
export const deletable = (
  article: Article
): Result.Result<Article, InvalidArticleTransition> =>
  article.state._tag === "publishing"
    ? refused(article, "delete")
    : Result.succeed(article);
