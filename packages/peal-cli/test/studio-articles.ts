import { DateTime, Effect, Ref } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  ArticleNotFound,
  ArticleRejected,
  ArticleStateConflict,
  ChannelNotFound,
  CurrentMember,
  Forbidden,
} from "peal-contract";
import type { Article, ArticleInput, Permission } from "peal-contract";

// The synthetic studio's articles: a website's channel, and an article
// published on it and one that failed. Handlers check the member's
// permissions as the server does, and keep what they are asked to do.

const at = (iso: string) => DateTime.makeUnsafe(iso);

const now = at("2026-11-14T10:00:00Z");

export const siteChannelId = "0190f3a0-0000-7000-8000-00000000a003";

export const publishedArticleId = "0190f3a0-0000-7000-8000-00000000f001";

export const failedArticleId = "0190f3a0-0000-7000-8000-00000000f002";

const scheduledAt = {
  scheduledAt: at("2026-11-14T08:00:00Z"),
  timeZone: "Europe/Paris",
};

const article = (fields: Partial<Article>): Article => ({
  authorId: null,
  body: {
    content: [
      {
        content: [{ text: "Sow peas early.", type: "text" }],
        type: "paragraph",
      },
    ],
    type: "doc",
  },
  categories: ["Vegetables"],
  channelId: siteChannelId,
  coverMediaId: null,
  createdAt: at("2026-11-13T09:00:00Z"),
  excerpt: null,
  id: publishedArticleId,
  siteStatus: "publish",
  state: { _tag: "draft" },
  tags: ["peas"],
  title: "Spring sowing",
  updatedAt: at("2026-11-14T08:00:03Z"),
  ...fields,
});

const articles: readonly Article[] = [
  article({
    state: {
      _tag: "published",
      ...scheduledAt,
      editedAt: null,
      permalink: "https://garden.example/2026/11/spring-sowing/",
      platformPostId: "1042",
      publishedAt: at("2026-11-14T08:00:03Z"),
      removedAt: null,
    },
  }),
  article({
    id: failedArticleId,
    state: {
      _tag: "failed",
      ...scheduledAt,
      code: "rest_cannot_create",
      failedAt: at("2026-11-14T08:00:03Z"),
      reason: "contentRejected",
    },
    title: "Autumn pruning",
  }),
];

export interface ArticlesState {
  readonly articles: readonly Article[];
  readonly changes: readonly string[];
}

export const makeArticles = Ref.make<ArticlesState>({ articles, changes: [] });

const allowed = (permission: Permission) =>
  CurrentMember.pipe(
    Effect.flatMap((member) =>
      member.permissions.includes(permission)
        ? Effect.succeed(member)
        : Effect.fail(new Forbidden())
    )
  );

// What an article says, as a request writes it.
const fromInput = (input: ArticleInput) => ({
  body: input.body,
  categories: input.categories ?? [],
  coverMediaId: input.coverMediaId ?? null,
  excerpt: input.excerpt ?? null,
  siteStatus: input.siteStatus ?? "publish",
  tags: input.tags ?? [],
  title: input.title,
});

/** The articles group, answered from `state`. */
export const studioArticlesLive = (state: Ref.Ref<ArticlesState>) => {
  const found = (articleId: string) =>
    Ref.get(state).pipe(
      Effect.flatMap((current) => {
        const known = current.articles.find(({ id }) => id === articleId);

        return known === undefined
          ? Effect.fail(new ArticleNotFound())
          : Effect.succeed(known);
      })
    );

  const saved = (next: Article, change: string) =>
    Ref.update(state, (current) => ({
      articles: current.articles.some(({ id }) => id === next.id)
        ? current.articles.map((each) => (each.id === next.id ? next : each))
        : [next, ...current.articles],
      changes: [...current.changes, change],
    })).pipe(Effect.as(next));

  return HttpApiBuilder.group(Api, "articles", (handlers) =>
    handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          yield* allowed("post:create");

          if (payload.channelId !== siteChannelId) {
            return yield* new ChannelNotFound();
          }

          if (payload.title.trim() === "") {
            return yield* new ArticleRejected({
              violations: [{ _tag: "titleMissing" }],
            });
          }

          const made = article({
            ...fromInput(payload),
            createdAt: now,
            id: "0190f3a0-0000-7000-8000-00000000f003",
            state:
              payload.schedule === undefined
                ? { _tag: "draft" }
                : {
                    _tag: "scheduled",
                    scheduledAt: payload.schedule.at ?? now,
                    timeZone: payload.schedule.timeZone,
                  },
            updatedAt: now,
          });

          return yield* saved(
            made,
            `article:create:${made.title}:${made.state._tag}`
          );
        }),
      delete: ({ params }) =>
        Effect.gen(function* remove() {
          yield* allowed("post:delete");
          yield* found(params.articleId);
          yield* Ref.update(state, (current) => ({
            articles: current.articles.filter(
              ({ id }) => id !== params.articleId
            ),
            changes: [...current.changes, `article:delete:${params.articleId}`],
          }));
        }),
      get: ({ params }) =>
        allowed("post:read").pipe(Effect.andThen(found(params.articleId))),
      list: ({ query }) =>
        Effect.gen(function* list() {
          yield* allowed("post:read");

          const { articles: all } = yield* Ref.get(state);

          return {
            items: all.filter(
              ({ state: standing }) =>
                query.status === undefined || standing._tag === query.status
            ),
            nextCursor: null,
          };
        }),
      retry: ({ params }) =>
        Effect.gen(function* retry() {
          yield* allowed("post:schedule");

          const current = yield* found(params.articleId);

          if (
            current.state._tag !== "failed" &&
            current.state._tag !== "unconfirmed"
          ) {
            return yield* new ArticleStateConflict({
              state: current.state._tag,
            });
          }

          return yield* saved(
            {
              ...current,
              state: {
                _tag: "scheduled",
                scheduledAt: now,
                timeZone: current.state.timeZone,
              },
            },
            `article:retry:${current.id}`
          );
        }),
      schedule: ({ params, payload }) =>
        Effect.gen(function* schedule() {
          yield* allowed("post:schedule");

          const current = yield* found(params.articleId);

          return yield* saved(
            {
              ...current,
              state: {
                _tag: "scheduled",
                scheduledAt: payload.at ?? now,
                timeZone: payload.timeZone,
              },
            },
            `article:schedule:${current.id}`
          );
        }),
      unpublish: ({ params }) =>
        Effect.gen(function* unpublish() {
          yield* allowed("post:publish");

          const current = yield* found(params.articleId);
          const { state: standing } = current;

          if (standing._tag !== "published" || standing.removedAt !== null) {
            return yield* new ArticleStateConflict({ state: standing._tag });
          }

          return yield* saved(
            { ...current, state: { ...standing, removedAt: now } },
            `article:unpublish:${current.id}`
          );
        }),
      unschedule: ({ params }) =>
        Effect.gen(function* unschedule() {
          yield* allowed("post:schedule");

          const current = yield* found(params.articleId);

          if (current.state._tag !== "scheduled") {
            return yield* new ArticleStateConflict({
              state: current.state._tag,
            });
          }

          return yield* saved(
            { ...current, state: { _tag: "draft" } },
            `article:unschedule:${current.id}`
          );
        }),
      update: ({ params, payload }) =>
        Effect.gen(function* update() {
          yield* allowed("post:update");

          const current = yield* found(params.articleId);

          return yield* saved(
            { ...current, ...fromInput(payload) },
            `article:update:${current.id}`
          );
        }),
      updateOnSite: ({ params, payload }) =>
        Effect.gen(function* updateOnSite() {
          yield* allowed("post:publish");

          const current = yield* found(params.articleId);

          return yield* saved(
            { ...current, ...fromInput(payload) },
            `article:update-on-site:${current.id}`
          );
        }),
    })
  );
};
