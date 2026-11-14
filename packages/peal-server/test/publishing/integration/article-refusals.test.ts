// What an article is refused before anything reaches its site: whatever
// would send it while the workspace's posts wait for an approval.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";

import type { ArticleEvents } from "#publishing/application/article-events.ts";
import { claimArticleRun } from "#publishing/application/article-publication.ts";
import { ArticleStore } from "#publishing/application/article-store.ts";
import { Articles } from "#publishing/application/articles.ts";
import { MediaInPosts } from "#publishing/application/media-in-posts.ts";
import { DrizzleArticleStore } from "#publishing/infrastructure/drizzle-article-store.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import type { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { fakeWordPress } from "#test/channels/fakes/fake-wordpress.ts";
import { freshWorkspace } from "#test/channels/support.ts";
import {
  afterArticleRead,
  approvalsHeld,
  coverImage,
  deletedMedia,
  planChannels,
  siteChannel,
} from "#test/publishing/article-server.ts";
import {
  content,
  onArticles,
  sentTo,
  writer,
  zone,
} from "#test/publishing/article-support.ts";

const later = Option.some({
  at: Option.some(DateTime.makeUnsafe("2026-06-20T09:30:00Z")),
  timeZone: zone,
});

// The violations of a refusal, by tag, or its own tag.
const tagsOf = (error: { readonly _tag: string }) =>
  "violations" in error && Array.isArray(error.violations)
    ? error.violations.map(
        (violation: { readonly _tag: string }) => violation._tag
      )
    : [error._tag];

// Runs the test with the workspace's posts waiting for an approval.
const held = <A, E, R>(test: Effect.Effect<A, E, R>) =>
  Ref.set(approvalsHeld, true).pipe(
    Effect.andThen(test),
    Effect.ensuring(Ref.set(approvalsHeld, false))
  );

describe("an article, while posts wait for an approval", () => {
  it.effect("is refused when it would go out, and saved as a draft", () =>
    onArticles(
      Effect.gen(function* refusedAtCreation() {
        const site = yield* fakeWordPress();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* siteChannel(workspaceId, site);
        const articles = yield* Articles;
        const actor = writer(workspaceId);

        const sooner = yield* held(
          articles
            .create(
              actor,
              { channelId: channel.id, content: content() },
              Option.some({ at: Option.none(), timeZone: zone })
            )
            .pipe(Effect.flip)
        );

        assert.deepStrictEqual(tagsOf(sooner), ["approvalRequired"]);

        const draft = yield* held(
          articles.create(
            actor,
            { channelId: channel.id, content: content() },
            Option.none()
          )
        );

        const scheduling = yield* held(
          articles
            .schedule(actor, draft.id, {
              at: Option.none(),
              timeZone: zone,
            })
            .pipe(Effect.flip)
        );

        assert.deepStrictEqual(tagsOf(scheduling), ["approvalRequired"]);
        assert.lengthOf(site.requests(), 0);
      })
    )
  );

  it.effect("keeps a scheduled one from being edited", () =>
    onArticles(
      Effect.gen(function* refusedEdit() {
        const site = yield* fakeWordPress();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* siteChannel(workspaceId, site);
        const articles = yield* Articles;
        const actor = writer(workspaceId);

        const article = yield* articles.create(
          actor,
          { channelId: channel.id, content: content() },
          later
        );

        const edit = yield* held(
          articles
            .update(actor, article.id, content({ title: "Changed" }))
            .pipe(Effect.flip)
        );

        assert.deepStrictEqual(tagsOf(edit), ["approvalRequired"]);

        // Taken back to draft, it may be changed.
        yield* held(articles.unschedule(actor, article.id));

        const changed = yield* held(
          articles.update(actor, article.id, content({ title: "Changed" }))
        );

        assert.strictEqual(changed.content.title, "Changed");
        assert.lengthOf(site.requests(), 0);
      })
    )
  );

  it.effect("is not sent again after failing", () =>
    onArticles(
      Effect.gen(function* refusedRetry() {
        const { actor, sent, site } = yield* sentTo(
          {},
          {},
          "synthetic revoked password"
        );

        const before = site.requests().length;

        const retry = yield* held(
          (yield* Articles).retry(actor, sent.id).pipe(Effect.flip)
        );

        assert.deepStrictEqual(tagsOf(retry), ["approvalRequired"]);
        assert.lengthOf(site.requests(), before);
      })
    )
  );

  it.effect("is not changed on its site, and may leave it", () =>
    onArticles(
      Effect.gen(function* refusedUpdate() {
        const { actor, sent, site } = yield* sentTo();
        const articles = yield* Articles;
        const before = site.requests().length;

        const update = yield* held(
          articles
            .updateOnSite(actor, sent.id, content({ title: "Changed" }))
            .pipe(Effect.flip)
        );

        assert.deepStrictEqual(tagsOf(update), ["approvalRequired"]);
        assert.lengthOf(site.requests(), before);

        yield* held(articles.unpublish(actor, sent.id));

        assert.strictEqual(site.posts()[0]?.status, "trash");
      })
    )
  );
});

describe("an article a member changes while its job claims it", () => {
  it.effect("is refused, and goes out once", () =>
    onArticles(
      Effect.gen(function* raced() {
        const site = yield* fakeWordPress();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* siteChannel(workspaceId, site);
        const articles = yield* Articles;
        const actor = writer(workspaceId);

        const article = yield* articles.create(
          actor,
          { channelId: channel.id, content: content() },
          later
        );

        // The job claims it once the member's edit read it.
        const services = yield* Effect.context<
          ArticleEvents | ArticleStore | TransactionRunner
        >();

        yield* Ref.set(
          afterArticleRead,
          claimArticleRun(
            {
              articleId: article.id,
              revision: article.revision,
              round: article.round,
            },
            DateTime.makeUnsafe("2026-06-20T09:30:00Z")
          ).pipe(Effect.asVoid, Effect.provideContext(services))
        );

        const edit = yield* articles
          .update(actor, article.id, content({ title: "Changed" }))
          .pipe(Effect.flip);

        assert.strictEqual(edit._tag, "InvalidArticleTransition");

        const stored = yield* ArticleStore.use((store) =>
          store.get(article.id)
        ).pipe(Effect.map(Option.getOrThrow));

        assert.strictEqual(stored.state._tag, "publishing");
        assert.strictEqual(stored.content.title, "Spring sowing");
        assert.lengthOf(site.posts(), 0);
      })
    )
  );
});

describe("an article refused at scheduling", () => {
  it.effect("waits while the workspace holds more channels than its plan", () =>
    onArticles(
      Effect.gen(function* overPlan() {
        const site = yield* fakeWordPress();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* siteChannel(workspaceId, site);
        const articles = yield* Articles;
        const actor = writer(workspaceId);

        const scheduled = yield* articles.create(
          actor,
          { channelId: channel.id, content: content() },
          later
        );

        const refused = yield* Ref.set(planChannels, {
          allowed: Option.some(2),
          connected: 3,
        }).pipe(
          Effect.andThen(
            articles
              .create(
                actor,
                { channelId: channel.id, content: content() },
                Option.some({ at: Option.none(), timeZone: zone })
              )
              .pipe(Effect.flip)
          ),
          Effect.ensuring(
            Ref.set(planChannels, { allowed: Option.none(), connected: 1 })
          )
        );

        assert.strictEqual(refused._tag, "PlanLimitReached");
        assert.lengthOf(site.requests(), 0);
        assert.strictEqual(scheduled.state._tag, "scheduled");
      })
    )
  );

  it.effect("names the files it shows that the library no longer has", () =>
    onArticles(
      Effect.gen(function* goneMedia() {
        const site = yield* fakeWordPress();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* siteChannel(workspaceId, site);
        const articles = yield* Articles;
        const actor = writer(workspaceId);

        const draft = yield* articles.create(
          actor,
          { channelId: channel.id, content: content() },
          Option.none()
        );

        // Its cover is deleted from the library while it is a draft.
        const refused = yield* Ref.set(
          deletedMedia,
          new Set([coverImage.media.mediaId])
        ).pipe(
          Effect.andThen(
            articles
              .schedule(actor, draft.id, { at: Option.none(), timeZone: zone })
              .pipe(Effect.flip)
          ),
          Effect.ensuring(Ref.set(deletedMedia, new Set()))
        );

        assert.strictEqual(refused._tag, "UnknownMedia");
        assert.lengthOf(site.requests(), 0);
      })
    )
  );
});

describe("a file of the library an article shows", () => {
  it.effect(
    "is kept while the article is scheduled, and listed for a draft",
    () =>
      onArticles(
        Effect.gen(function* kept() {
          const site = yield* fakeWordPress();
          const workspaceId = yield* freshWorkspace;
          const channel = yield* siteChannel(workspaceId, site);
          const articles = yield* Articles;
          const actor = writer(workspaceId);
          const cover = coverImage.media.mediaId;

          const scheduled = yield* articles.create(
            actor,
            { channelId: channel.id, content: content() },
            later
          );

          const draft = yield* articles.create(
            actor,
            { channelId: channel.id, content: content() },
            Option.none()
          );

          const inPosts = yield* MediaInPosts.pipe(
            Effect.provide(
              MediaInPosts.layer.pipe(
                Layer.provide(
                  Layer.merge(DrizzlePostRepository, DrizzleArticleStore)
                )
              )
            )
          );

          assert.deepStrictEqual(
            (yield* inPosts.usage(workspaceId, cover)).articles,
            { drafts: [draft.id], scheduled: [scheduled.id] }
          );
          assert.deepStrictEqual(yield* inPosts.release(workspaceId, cover), {
            _tag: "inUse",
            articles: [scheduled.id],
            scheduled: [],
          });

          yield* articles.unschedule(actor, scheduled.id);

          assert.strictEqual(
            (yield* inPosts.release(workspaceId, cover))._tag,
            "unused"
          );
        })
      )
  );
});
