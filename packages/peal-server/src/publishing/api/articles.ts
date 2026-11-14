import { Effect, Match, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  ArticleChangeRefused,
  ArticleNotFound,
  ArticleRejected,
  ArticleStateConflict,
  ChannelNotFound,
  CurrentMember,
  defaultArticlePageSize,
  InvalidTimeZone,
  PlatformUnreachable,
  UnknownMedia,
} from "peal-contract";
import type {
  ArticleInput,
  ArticleTime as ArticleTimeInput,
} from "peal-contract";

import type {
  ArticleFailure,
  ArticleTime,
  ArticleWriteFailure,
  SiteChangeFailure,
} from "#publishing/application/articles.ts";
import { Articles } from "#publishing/application/articles.ts";
import { ArticleBodySchema } from "#publishing/domain/article-body.ts";
import { ArticleContent } from "#publishing/domain/article-content.ts";
import { ArticleIdSchema } from "#publishing/domain/article-id.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { limitRefusal } from "#shared/api/limit-reached.ts";
import type { LimitRefusal } from "#shared/api/limit-reached.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

import { articleView } from "./article-view.ts";

const decodeBody = Schema.decodeUnknownEffect(ArticleBodySchema);

const decodeTimeZone = Schema.decodeUnknownEffect(TimeZoneIdSchema);

const decodeMediaId = Schema.decodeUnknownEffect(MediaAssetIdSchema);

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

const decodeCursor = Schema.decodeUnknownOption(ArticleIdSchema);

const bodyInvalid = () =>
  Effect.fail(new ArticleRejected({ violations: [{ _tag: "bodyInvalid" }] }));

// What the request asks the article to say, as the domain holds it: a
// body that is not the editor's document of the allow-list is refused.
const contentOf = Effect.fnUntraced(function* contentOf(input: ArticleInput) {
  const body = yield* decodeBody(input.body).pipe(Effect.catch(bodyInvalid));

  const cover =
    input.coverMediaId === undefined || input.coverMediaId === null
      ? Option.none()
      : Option.some(
          yield* decodeMediaId(input.coverMediaId).pipe(
            Effect.mapError(
              () => new UnknownMedia({ mediaIds: [input.coverMediaId ?? ""] })
            )
          )
        );

  return new ArticleContent({
    body,
    categories: input.categories ?? [],
    coverMediaId: cover,
    excerpt: Option.fromNullishOr(input.excerpt).pipe(
      Option.filter((excerpt) => excerpt.trim() !== "")
    ),
    siteStatus: input.siteStatus ?? "publish",
    tags: input.tags ?? [],
    title: input.title,
  });
});

const timeOf = Effect.fnUntraced(function* timeOf(input: ArticleTimeInput) {
  const timeZone = yield* decodeTimeZone(input.timeZone).pipe(
    Effect.mapError(() => new InvalidTimeZone({ timeZone: input.timeZone }))
  );

  const time: ArticleTime = { at: Option.fromUndefinedOr(input.at), timeZone };

  return time;
});

const failureOf = (failure: ArticleFailure) =>
  Match.valueTags(failure, {
    ArticleNotFound: () => Effect.fail(new ArticleNotFound()),
    DatabaseError: Effect.die,
    InvalidArticleTransition: ({ from }) =>
      Effect.fail(new ArticleStateConflict({ state: from })),
    MissingPermission: forbidden,
  });

const writeFailureOf =
  (limitReached: LimitRefusal) => (failure: ArticleWriteFailure) =>
    Match.valueTags(failure, {
      ArticleNotFound: () => Effect.fail(new ArticleNotFound()),
      ArticleRejected: ({ violations }) =>
        Effect.fail(new ArticleRejected({ violations })),
      DatabaseError: Effect.die,
      InvalidArticleTransition: ({ from }) =>
        Effect.fail(new ArticleStateConflict({ state: from })),
      MissingPermission: forbidden,
      PlanLimitReached: limitReached,
      SiteNotFound: () => Effect.fail(new ChannelNotFound()),
      UnknownMedia: ({ mediaIds }) =>
        Effect.fail(new UnknownMedia({ mediaIds })),
    });

// How the site's refusal of a change reads: its own code, or Peal's.
const siteFailureOf =
  (limitReached: LimitRefusal) => (failure: SiteChangeFailure) =>
    Match.valueTags(failure, {
      ArticleNotFound: () => Effect.fail(new ArticleNotFound()),
      ArticleRejected: ({ violations }) =>
        Effect.fail(new ArticleRejected({ violations })),
      BadRequest: ({ code }) => Effect.fail(new ArticleChangeRefused({ code })),
      DatabaseError: Effect.die,
      InvalidArticleTransition: ({ from }) =>
        Effect.fail(new ArticleStateConflict({ state: from })),
      MediaRejected: ({ code }) =>
        Effect.fail(new ArticleChangeRefused({ code })),
      MissingPermission: forbidden,
      PlanLimitReached: limitReached,
      PlatformUnavailable: (unavailable) =>
        Effect.logWarning(
          "A website did not take a change of an article",
          unavailable
        ).pipe(Effect.andThen(Effect.fail(new PlatformUnreachable()))),
      RateLimited: () => Effect.fail(new PlatformUnreachable()),
      TokenExpired: () =>
        Effect.fail(new ArticleChangeRefused({ code: "tokenExpired" })),
      UnknownMedia: ({ mediaIds }) =>
        Effect.fail(new UnknownMedia({ mediaIds })),
    });

export const ArticlesHandlers = HttpApiBuilder.group(
  Api,
  "articles",
  Effect.fn(function* articlesHandlers(handlers) {
    const articles = yield* Articles;
    const limitReached = yield* limitRefusal;
    const onWrite = writeFailureOf(limitReached);
    const onSite = siteFailureOf(limitReached);

    return handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const channelId = decodeChannelId(payload.channelId);

          if (Option.isNone(channelId)) {
            return yield* new ChannelNotFound();
          }

          const content = yield* contentOf(payload);

          const time =
            payload.schedule === undefined
              ? Option.none()
              : Option.some(yield* timeOf(payload.schedule));

          const article = yield* articles
            .create(
              actorOf(yield* CurrentMember),
              { channelId: channelId.value, content },
              time
            )
            .pipe(Effect.catch(onWrite));

          return articleView(article);
        }),
      delete: ({ params }) =>
        Effect.gen(function* remove() {
          yield* articles
            .remove(actorOf(yield* CurrentMember), params.articleId)
            .pipe(Effect.catch(failureOf));
        }),
      get: ({ params }) =>
        Effect.gen(function* get() {
          const article = yield* articles
            .get(actorOf(yield* CurrentMember), params.articleId)
            .pipe(
              Effect.catchTags({
                ArticleNotFound: () => Effect.fail(new ArticleNotFound()),
                DatabaseError: Effect.die,
                InvalidArticleTransition: Effect.die,
                MissingPermission: forbidden,
              })
            );

          return articleView(article);
        }),
      list: ({ query }) =>
        Effect.gen(function* list() {
          const before =
            query.cursor === undefined
              ? Option.none()
              : decodeCursor(query.cursor);

          if (query.cursor !== undefined && Option.isNone(before)) {
            return yield* new HttpApiError.BadRequest();
          }

          const page = yield* articles
            .page(actorOf(yield* CurrentMember), {
              before,
              limit: query.limit ?? defaultArticlePageSize,
              status: Option.fromUndefinedOr(query.status),
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
              })
            );

          return {
            items: page.items.map(articleView),
            nextCursor: Option.getOrNull(page.next),
          };
        }),
      retry: ({ params }) =>
        Effect.gen(function* retry() {
          const article = yield* articles
            .retry(actorOf(yield* CurrentMember), params.articleId)
            .pipe(Effect.catch(onWrite));

          return articleView(article);
        }),
      schedule: ({ params, payload }) =>
        Effect.gen(function* schedule() {
          const time = yield* timeOf(payload);

          const article = yield* articles
            .schedule(actorOf(yield* CurrentMember), params.articleId, time)
            .pipe(Effect.catch(onWrite));

          return articleView(article);
        }),
      unpublish: ({ params }) =>
        Effect.gen(function* unpublish() {
          const article = yield* articles
            .unpublish(actorOf(yield* CurrentMember), params.articleId)
            .pipe(Effect.catch(onSite));

          return articleView(article);
        }),
      unschedule: ({ params }) =>
        Effect.gen(function* unschedule() {
          const article = yield* articles
            .unschedule(actorOf(yield* CurrentMember), params.articleId)
            .pipe(Effect.catch(failureOf));

          return articleView(article);
        }),
      update: ({ params, payload }) =>
        Effect.gen(function* update() {
          const content = yield* contentOf(payload);

          const article = yield* articles
            .update(actorOf(yield* CurrentMember), params.articleId, content)
            .pipe(Effect.catch(onWrite));

          return articleView(article);
        }),
      updateOnSite: ({ params, payload }) =>
        Effect.gen(function* updateOnSite() {
          const content = yield* contentOf(payload);

          const article = yield* articles
            .updateOnSite(
              actorOf(yield* CurrentMember),
              params.articleId,
              content
            )
            .pipe(Effect.catch(onSite));

          return articleView(article);
        }),
    });
  })
);
