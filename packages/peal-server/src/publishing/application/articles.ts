import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { ArticleContent } from "#publishing/domain/article-content.ts";
import { ArticleIdSchema } from "#publishing/domain/article-id.ts";
import type { ArticleId } from "#publishing/domain/article-id.ts";
import { ArticleRejected } from "#publishing/domain/article-rejected.ts";
import {
  articleMediaOf,
  articleViolations,
  deletable,
  edited,
  livePostOf,
  newArticle,
  removedFromSite,
  retried,
  scheduled,
  sendAt,
  unscheduled,
  updatedOnSite,
} from "#publishing/domain/article.ts";
import type { Article, ArticleViolation } from "#publishing/domain/article.ts";
import type { InvalidArticleTransition } from "#publishing/domain/invalid-article-transition.ts";
import { authorOf } from "#publishing/domain/post.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor, Permission } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";

import { ArticleJobs } from "./article-jobs.ts";
import type { ArticleJob } from "./article-jobs.ts";
import { ArticleNotFound } from "./article-not-found.ts";
import { ArticleStore } from "./article-store.ts";
import type { ArticlePage, ArticlePageRequest } from "./article-store.ts";
import { AttachableMedia } from "./attachable-media.ts";
import { SiteChannels } from "./site-channels.ts";
import { SiteNotFound } from "./site-not-found.ts";
import { SitePublisher } from "./site-publisher.ts";
import { UnknownMedia } from "./unknown-media.ts";

/** When an article goes out: at a time in a zone, or now. */
export interface ArticleTime {
  readonly at: Option.Option<DateTime.Utc>;
  readonly timeZone: TimeZoneId;
}

export type ArticleFailure =
  | ArticleNotFound
  | DatabaseError
  | InvalidArticleTransition
  | MissingPermission;

export type ArticleWriteFailure =
  | ArticleFailure
  | ArticleRejected
  | SiteNotFound
  | UnknownMedia;

/** The site refused a change of the article's post, or did not answer. */
export type SiteChangeFailure =
  | Exclude<ArticleWriteFailure, SiteNotFound>
  | PublishFailure;

const rejected = (violations: readonly ArticleViolation[]) => {
  const [first, ...rest] = violations;

  return first === undefined
    ? Effect.void
    : Effect.fail(new ArticleRejected({ violations: [first, ...rest] }));
};

const decodeArticleId = (id: string) =>
  Option.getOrUndefined(Schema.decodeUnknownOption(ArticleIdSchema)(id));

const allowed = (actor: Actor, permission: Permission) =>
  Effect.fromResult(authorize(actor, permission));

const jobOf = (article: Article): ArticleJob => ({
  articleId: article.id,
  revision: article.revision,
  round: article.round,
});

/**
 * A workspace's articles, for its websites: written, scheduled (Peal sends
 * each at its time, through `ArticleJobs`), sent again after failing,
 * changed or moved to the trash on the site once there. Writing takes the
 * permissions posts take: post:create, post:update, post:delete,
 * post:schedule to send, post:publish to change what is on a site, and
 * post:read to read.
 */
export class Articles extends Context.Service<
  Articles,
  {
    readonly create: (
      actor: Actor,
      draft: {
        readonly channelId: ChannelId;
        readonly content: ArticleContent;
      },
      time: Option.Option<ArticleTime>
    ) => Effect.Effect<Article, ArticleWriteFailure>;
    readonly update: (
      actor: Actor,
      articleId: string,
      content: ArticleContent
    ) => Effect.Effect<Article, ArticleWriteFailure>;
    readonly remove: (
      actor: Actor,
      articleId: string
    ) => Effect.Effect<void, ArticleFailure>;
    readonly schedule: (
      actor: Actor,
      articleId: string,
      time: ArticleTime
    ) => Effect.Effect<Article, ArticleWriteFailure>;
    readonly unschedule: (
      actor: Actor,
      articleId: string
    ) => Effect.Effect<Article, ArticleFailure>;
    readonly retry: (
      actor: Actor,
      articleId: string
    ) => Effect.Effect<Article, ArticleWriteFailure>;
    readonly unpublish: (
      actor: Actor,
      articleId: string
    ) => Effect.Effect<Article, SiteChangeFailure>;
    readonly updateOnSite: (
      actor: Actor,
      articleId: string,
      content: ArticleContent
    ) => Effect.Effect<Article, SiteChangeFailure>;
    readonly get: (
      actor: Actor,
      articleId: string
    ) => Effect.Effect<Article, ArticleFailure>;
    readonly page: (
      actor: Actor,
      request: Omit<ArticlePageRequest, "workspaceId">
    ) => Effect.Effect<ArticlePage, DatabaseError | MissingPermission>;
  }
>()("peal-server/publishing/application/Articles") {
  static readonly layer = Layer.effect(
    Articles,
    Effect.gen(function* ArticlesLive() {
      const store = yield* ArticleStore;
      const jobs = yield* ArticleJobs;
      const sites = yield* SiteChannels;
      const media = yield* AttachableMedia;
      const publisher = yield* SitePublisher;
      const ids = yield* Ids;
      const { transaction } = yield* TransactionRunner;

      const found = Effect.fn("Articles.found")(function* found(
        actor: Actor,
        articleId: string
      ) {
        const id = decodeArticleId(articleId);

        if (id === undefined) {
          return yield* new ArticleNotFound({ articleId });
        }

        const article = yield* store.ofWorkspace(actor.workspaceId, id);

        if (Option.isNone(article)) {
          return yield* new ArticleNotFound({ articleId });
        }

        return article.value;
      });

      // The files the article shows are the workspace's, ready, and
      // images: the cover is refused as a violation, any other as unknown.
      const checkMedia = Effect.fn("Articles.checkMedia")(function* checkMedia(
        actor: Actor,
        content: ArticleContent
      ) {
        const wanted = articleMediaOf(content);

        const files =
          wanted.length === 0 ? [] : yield* media.lookUp(actor, wanted);

        const images = new Set(
          files.flatMap((file) =>
            file.contentType.startsWith("image/") ? [file.mediaId] : []
          )
        );

        const known = new Set(files.map((file) => file.mediaId));
        const [missing, ...more] = wanted.filter((id) => !known.has(id));

        if (missing !== undefined) {
          return yield* new UnknownMedia({ mediaIds: [missing, ...more] });
        }

        if (content.coverMediaId.pipe(Option.exists((id) => !images.has(id)))) {
          return yield* new ArticleRejected({
            violations: [{ _tag: "coverNotImage" }],
          });
        }

        const [notImage, ...others] = wanted.filter((id) => !images.has(id));

        return yield* notImage === undefined
          ? Effect.void
          : new UnknownMedia({ mediaIds: [notImage, ...others] });
      });

      // Saves the article, stops the job of what it was, and starts the
      // one of what it is when it waits to go out, in one transaction.
      const saved = Effect.fn("Articles.saved")(function* saved(
        before: Option.Option<Article>,
        after: Article
      ) {
        const now = yield* DateTime.now;

        return yield* transaction(
          Effect.gen(function* savedInTransaction() {
            yield* Option.match(before, {
              onNone: () => store.insert(after),
              onSome: () => store.update(after),
            });

            if (
              Option.exists(
                before,
                (earlier) =>
                  earlier.state._tag === "scheduled" &&
                  (earlier.revision !== after.revision ||
                    earlier.round !== after.round)
              )
            ) {
              yield* Option.match(before, {
                onNone: () => Effect.void,
                onSome: (earlier) => jobs.stop(jobOf(earlier)),
              });
            }

            if (
              after.state._tag === "scheduled" &&
              !Option.exists(
                before,
                (earlier) =>
                  earlier.state._tag === "scheduled" &&
                  earlier.revision === after.revision &&
                  earlier.round === after.round
              )
            ) {
              yield* jobs.start(jobOf(after), sendAt(after, now));
            }

            return after;
          })
        );
      });

      // The article goes out at `time`: what it says is checked as the
      // site would take it, and the time must not have passed.
      const scheduling = Effect.fn("Articles.scheduling")(function* scheduling(
        article: Article,
        time: ArticleTime
      ) {
        const now = yield* DateTime.now;
        const at = Option.getOrElse(time.at, () => now);
        const schedule = new Schedule({ at, timeZone: time.timeZone });

        yield* rejected([
          ...(Option.isSome(time.at) && DateTime.isLessThan(at, now)
            ? [{ _tag: "timeInPast" } as const]
            : []),
          ...articleViolations(article.content, schedule, now),
        ]);

        return yield* Effect.fromResult(scheduled(article, schedule, now));
      });

      const create = Effect.fn("Articles.create")(function* create(
        actor: Actor,
        draft: {
          readonly channelId: ChannelId;
          readonly content: ArticleContent;
        },
        time: Option.Option<ArticleTime>
      ) {
        yield* allowed(actor, "post:create");

        if (Option.isSome(time)) {
          yield* allowed(actor, "post:schedule");
        }

        const site = yield* sites.lookUp(actor, draft.channelId);

        if (Option.isNone(site)) {
          return yield* new SiteNotFound({ channelId: draft.channelId });
        }

        yield* checkMedia(actor, draft.content);

        const id = yield* newId(ArticleIdSchema).pipe(
          Effect.provideService(Ids, ids)
        );

        const article = newArticle(
          {
            authorId: authorOf(actor),
            channelId: draft.channelId,
            content: draft.content,
            id,
            workspaceId: actor.workspaceId,
          },
          yield* DateTime.now
        );

        const placed = yield* Option.match(time, {
          onNone: () => Effect.succeed(article),
          onSome: (when) => scheduling(article, when),
        });

        return yield* saved(Option.none(), placed);
      });

      const update = Effect.fn("Articles.update")(function* update(
        actor: Actor,
        articleId: string,
        content: ArticleContent
      ) {
        yield* allowed(actor, "post:update");

        const article = yield* found(actor, articleId);

        yield* checkMedia(actor, content);

        const next = yield* Effect.fromResult(
          edited(article, content, yield* DateTime.now)
        );

        // A scheduled article is checked again, as when it was scheduled.
        if (next.state._tag === "scheduled") {
          yield* rejected(
            articleViolations(content, next.state.schedule, yield* DateTime.now)
          );
        }

        return yield* saved(Option.some(article), next);
      });

      const remove = Effect.fn("Articles.remove")(function* remove(
        actor: Actor,
        articleId: string
      ) {
        yield* allowed(actor, "post:delete");

        const article = yield* found(actor, articleId);

        yield* Effect.fromResult(deletable(article));

        yield* transaction(
          Effect.gen(function* removing() {
            if (article.state._tag === "scheduled") {
              yield* jobs.stop(jobOf(article));
            }

            yield* store.remove(actor.workspaceId, article.id);
          })
        );
      });

      const schedule = Effect.fn("Articles.schedule")(function* schedule(
        actor: Actor,
        articleId: string,
        time: ArticleTime
      ) {
        yield* allowed(actor, "post:schedule");

        const article = yield* found(actor, articleId);

        return yield* saved(
          Option.some(article),
          yield* scheduling(article, time)
        );
      });

      const unschedule = Effect.fn("Articles.unschedule")(function* unschedule(
        actor: Actor,
        articleId: string
      ) {
        yield* allowed(actor, "post:schedule");

        const article = yield* found(actor, articleId);

        const next = yield* Effect.fromResult(
          unscheduled(article, yield* DateTime.now)
        );

        return yield* saved(Option.some(article), next);
      });

      const retry = Effect.fn("Articles.retry")(function* retry(
        actor: Actor,
        articleId: string
      ) {
        yield* allowed(actor, "post:schedule");

        const article = yield* found(actor, articleId);
        const now = yield* DateTime.now;
        const next = yield* Effect.fromResult(retried(article, now));

        if (next.state._tag === "scheduled") {
          yield* rejected(
            articleViolations(next.content, next.state.schedule, now)
          );
        }

        return yield* saved(Option.some(article), next);
      });

      // Saves what the site now has, on the article as it is by then.
      const afterSite = (
        articleId: ArticleId,
        change: (article: Article, now: DateTime.Utc) => Article
      ) =>
        transaction(
          Effect.gen(function* afterSiteChange() {
            const current = yield* store.lock(articleId);
            const now = yield* DateTime.now;

            if (Option.isNone(current)) {
              return yield* new ArticleNotFound({ articleId });
            }

            const next = change(current.value, now);

            yield* store.update(next);

            return next;
          })
        );

      const unpublish = Effect.fn("Articles.unpublish")(function* unpublish(
        actor: Actor,
        articleId: string
      ) {
        yield* allowed(actor, "post:publish");

        const article = yield* found(actor, articleId);
        const live = yield* Effect.fromResult(livePostOf(article, "unpublish"));

        yield* publisher.remove(article, live.platformPostId);

        return yield* afterSite(article.id, removedFromSite);
      });

      const updateOnSite = Effect.fn("Articles.updateOnSite")(
        function* updateOnSite(
          actor: Actor,
          articleId: string,
          content: ArticleContent
        ) {
          yield* allowed(actor, "post:publish");

          const article = yield* found(actor, articleId);

          const live = yield* Effect.fromResult(
            livePostOf(article, "updateOnSite")
          );

          yield* checkMedia(actor, content);
          yield* rejected(
            articleViolations(
              // Already on the site: it keeps what it was made as.
              content,
              live.schedule,
              live.publishedAt
            ).filter(({ _tag }) => _tag !== "siteTimeInPast")
          );

          const changed = updatedOnSite(article, content, yield* DateTime.now);

          yield* publisher.update(changed, live.platformPostId);

          return yield* afterSite(article.id, (current, now) =>
            updatedOnSite(current, content, now)
          );
        }
      );

      const get = Effect.fn("Articles.get")(function* get(
        actor: Actor,
        articleId: string
      ) {
        yield* allowed(actor, "post:read");

        return yield* found(actor, articleId);
      });

      const page = Effect.fn("Articles.page")(function* page(
        actor: Actor,
        request: Omit<ArticlePageRequest, "workspaceId">
      ) {
        yield* allowed(actor, "post:read");

        return yield* store.page({
          ...request,
          workspaceId: actor.workspaceId,
        });
      });

      return Articles.of({
        create,
        get,
        page,
        remove,
        retry,
        schedule,
        unpublish,
        unschedule,
        update,
        updateOnSite,
      });
    })
  );
}
