import { Buffer } from "node:buffer";

// An article goes to a WordPress site through its job, as the site's REST
// API documents it: its files to the media library, its tags and
// categories by name, then the post, once; a lost answer is looked for
// and adopted, never sent again; a refused password marks the website to
// reconnect; once there, it is updated in place, or moved to the trash.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Option, Ref } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ArticleJournal } from "#publishing/application/article-journal.ts";
import { ArticleStore } from "#publishing/application/article-store.ts";
import { Articles } from "#publishing/application/articles.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { fakeWordPress } from "#test/channels/fakes/fake-wordpress.ts";
import { freshWorkspace } from "#test/channels/support.ts";
import {
  bodyImage,
  coverImage,
  guardRefusal,
  siteChannel,
  toldArticles,
} from "#test/publishing/article-server.ts";
import {
  content,
  eventuallyLater,
  onArticles,
  sentTo,
  stateOf,
  writer,
  zone,
} from "#test/publishing/article-support.ts";
import { eventually } from "#test/publishing/infrastructure/harness.ts";

describe("an article", () => {
  it.effect("goes to its site once: files, terms, then the post", () =>
    onArticles(
      Effect.gen(function* sent() {
        const { sent: article, site } = yield* sentTo();

        assert.strictEqual(stateOf(article), "published");

        const [post] = site.posts();

        assert.lengthOf(site.posts(), 1);
        assert.strictEqual(post?.title, "Spring sowing");
        assert.strictEqual(post?.status, "publish");
        assert.strictEqual(post?.excerpt, "What to sow first.");

        // The files went first, as they are, under their names.
        const files = site.media();

        assert.lengthOf(files, 2);
        assert.deepStrictEqual(
          files.map(({ bytes }) => bytes.length),
          [coverImage.media.byteSize, bodyImage.media.byteSize]
        );
        assert.isTrue(
          Buffer.from(coverImage.bytes).equals(
            files[0]?.bytes ?? Buffer.alloc(0)
          )
        );
        assert.strictEqual(post?.featured_media, files[0]?.id);

        // The HTML is written from the document, the image at the site's
        // address for it.
        assert.include(post?.content, "<h2>Sow early</h2>");
        assert.include(post?.content, "<p>Peas &amp; beans &lt;first&gt;.</p>");
        assert.include(
          post?.content,
          `<img src="${new URL(site.home).origin}/wp-content/uploads/${bodyImage.media.fileName}" alt="A row of peas">`
        );

        // The category the site had is taken, the others made.
        assert.include(post?.categories ?? [], 1);
        assert.sameMembers(
          [...site.categories().values()],
          ["Uncategorized", "Vegetables"]
        );
        assert.sameMembers([...site.tags().values()], ["peas", "spring"]);

        assert.include(yield* Ref.get(toldArticles), `published:${article.id}`);

        if (article.state._tag === "published") {
          assert.strictEqual(article.state.platformPostId, String(post?.id));
          assert.strictEqual(
            article.state.permalink,
            `${new URL(site.home).origin}/?p=${post?.id}`
          );
        }
      })
    )
  );

  it.effect(
    "waits on the site's calendar when the site publishes it itself",
    () =>
      onArticles(
        Effect.gen(function* future() {
          const site = yield* fakeWordPress();
          const workspaceId = yield* freshWorkspace;
          const channel = yield* siteChannel(workspaceId, site);
          const at = DateTime.makeUnsafe("2026-06-20T09:30:00Z");

          const article = yield* (yield* Articles).create(
            writer(workspaceId),
            {
              channelId: channel.id,
              content: content({ siteStatus: "future" }),
            },
            Option.some({ at: Option.some(at), timeZone: zone })
          );

          // Sent at once, not on the 20th.
          yield* eventually(
            "the article is sent",
            Effect.sync(() => site.posts().length === 1)
          );

          const [post] = site.posts();

          assert.strictEqual(post?.status, "future");
          assert.strictEqual(post?.date_gmt, "2026-06-20T09:30:00");
          assert.isDefined(article);
        })
      )
  );

  it.effect(
    "adopts the post whose answer was lost, and sends nothing again",
    () =>
      onArticles(
        Effect.gen(function* lost() {
          let created = 0;

          const { sent: article, site } = yield* sentTo({
            // The site makes the post, and its answer never comes.
            drop: (request) => {
              if (
                request.route === "/wp/v2/posts" &&
                request.method === "POST"
              ) {
                created += 1;

                return true;
              }

              return false;
            },
          });

          assert.strictEqual(stateOf(article), "published");
          assert.lengthOf(site.posts(), 1);
          assert.strictEqual(created, 1);
        })
      )
  );

  it.effect(
    "marks the website to reconnect when the site refuses its password",
    () =>
      onArticles(
        Effect.gen(function* refused() {
          const {
            channelId,
            sent: article,
            site,
          } = yield* sentTo({}, {}, "synthetic revoked password");

          assert.strictEqual(stateOf(article), "failed");
          assert.strictEqual(
            article.state._tag === "failed" ? article.state.reason : undefined,
            "tokenExpired"
          );
          assert.lengthOf(site.posts(), 0);

          const channel = yield* ChannelRepository.use((channels) =>
            channels.get(channelId)
          );

          assert.strictEqual(
            Option.getOrUndefined(channel)?.status._tag,
            "refreshNeeded"
          );
          assert.include(yield* Ref.get(toldArticles), `failed:${article.id}`);
        })
      )
  );

  it.effect("is changed on its site in place, then moved to the trash", () =>
    onArticles(
      Effect.gen(function* live() {
        const { actor, sent: article, site } = yield* sentTo();
        const articles = yield* Articles;

        const updated = yield* articles.updateOnSite(
          actor,
          article.id,
          content({ title: "Spring sowing, revised" })
        );

        assert.lengthOf(site.posts(), 1);
        assert.strictEqual(site.posts()[0]?.title, "Spring sowing, revised");
        assert.strictEqual(site.posts()[0]?.status, "publish");
        assert.isTrue(
          updated.state._tag === "published" &&
            updated.state.editedAt !== undefined
        );

        const removed = yield* articles.unpublish(actor, article.id);

        assert.strictEqual(site.posts()[0]?.status, "trash");
        assert.isTrue(
          removed.state._tag === "published" &&
            removed.state.removedAt !== undefined
        );

        // Gone already: asked again, it is refused before any call.
        const again = yield* articles
          .unpublish(actor, article.id)
          .pipe(Effect.flip);

        assert.strictEqual(again._tag, "InvalidArticleTransition");
      })
    )
  );

  it.effect(
    "is refused at scheduling, all at once, when the site would refuse it",
    () =>
      onArticles(
        Effect.gen(function* refusedAtOnce() {
          const site = yield* fakeWordPress();
          const workspaceId = yield* freshWorkspace;
          const channel = yield* siteChannel(workspaceId, site);

          const refused = yield* (yield* Articles)
            .create(
              writer(workspaceId),
              {
                channelId: channel.id,
                content: content({
                  body: { content: [], type: "doc" },
                  title: " ",
                }),
              },
              Option.some({
                at: Option.some(DateTime.makeUnsafe("2026-06-14T07:00:00Z")),
                timeZone: zone,
              })
            )
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "ArticleRejected");
          assert.deepStrictEqual(
            refused._tag === "ArticleRejected"
              ? refused.violations.map(({ _tag }) => _tag)
              : [],
            ["timeInPast", "titleMissing", "bodyMissing"]
          );
          assert.lengthOf(site.posts(), 0);
        })
      )
  );

  it.effect("goes only to a website of the workspace", () =>
    onArticles(
      Effect.gen(function* elsewhere() {
        const workspaceId = yield* freshWorkspace;
        const other = yield* freshWorkspace;
        const site = yield* fakeWordPress();
        const channel = yield* siteChannel(other, site);

        const refused = yield* (yield* Articles)
          .create(
            writer(workspaceId),
            { channelId: channel.id, content: content() },
            Option.none()
          )
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "SiteNotFound");
      })
    )
  );
  it.effect(
    "reaches its site with its title and excerpt as plain text, adopted by that title when the answer is lost",
    () =>
      onArticles(
        Effect.gen(function* plainText() {
          const { sent: article, site } = yield* sentTo(
            {
              drop: (request) =>
                request.route === "/wp/v2/posts" && request.method === "POST",
            },
            {
              excerpt: Option.some("<script>synthetic()</script> & more"),
              title: "Peas & <b>beans</b>",
            }
          );

          const [post] = site.posts();

          assert.lengthOf(site.posts(), 1);
          assert.strictEqual(
            post?.title,
            "Peas &amp; &lt;b&gt;beans&lt;/b&gt;"
          );
          assert.strictEqual(
            post?.excerpt,
            "&lt;script&gt;synthetic()&lt;/script&gt; &amp; more"
          );
          assert.strictEqual(stateOf(article), "published");
        })
      )
  );

  it.effect(
    "is adopted by a title with an apostrophe, as WordPress keeps it",
    () =>
      onArticles(
        Effect.gen(function* apostrophe() {
          const { sent: article, site } = yield* sentTo(
            {
              drop: (request) =>
                request.route === "/wp/v2/posts" && request.method === "POST",
            },
            { title: "What's new" }
          );

          assert.strictEqual(site.posts()[0]?.title, "What&#039;s new");
          assert.strictEqual(stateOf(article), "published");
        })
      )
  );

  it.effect("leaves the site's default category when it names none", () =>
    onArticles(
      Effect.gen(function* noCategories() {
        const { site } = yield* sentTo({}, { categories: [] });

        const made = site
          .requests()
          .find(
            ({ method, query, route }) =>
              route === "/wp/v2/posts" &&
              method === "POST" &&
              query.get("search") === null
          );

        assert.isFalse(made?.body.toString().includes('"categories"'));
      })
    )
  );

  it.effect(
    "takes no older post of that title on a site that ignores when posts changed",
    () =>
      onArticles(
        Effect.gen(function* olderSite() {
          let old = 0;

          const { sent: article } = yield* sentTo(
            {
              beforeModifiedAfter: true,
              drop: (request) =>
                request.route === "/wp/v2/posts" && request.method === "POST",
            },
            {},
            undefined,
            (site) => {
              old = site.addPost({
                modified_gmt: "2020-01-01T00:00:00",
                title: "Spring sowing",
              });
            }
          );

          assert.strictEqual(stateOf(article), "published");
          assert.notStrictEqual(
            article.state._tag === "published"
              ? article.state.platformPostId
              : undefined,
            String(old)
          );
        })
      )
  );

  it.effect("sends a file again that the site's library lost", () =>
    onArticles(
      Effect.gen(function* lostFile() {
        const { actor, sent: article, site } = yield* sentTo();
        const cover = site.posts()[0]?.featured_media ?? 0;

        site.deleteMedia(cover);

        yield* (yield* Articles).updateOnSite(
          actor,
          article.id,
          content({ title: "Spring sowing, revised" })
        );

        const [post] = site.posts();

        assert.strictEqual(post?.title, "Spring sowing, revised");
        assert.notStrictEqual(post?.featured_media, cover);
        assert.isTrue(
          site.media().some(({ id }) => id === post?.featured_media)
        );
      })
    )
  );

  it.effect(
    "takes the site's term whose name holds an ampersand, and the one it made before",
    () =>
      onArticles(
        Effect.gen(function* encodedTerms() {
          const site = yield* fakeWordPress();
          const food = site.addCategory("Food & Drink");
          const workspaceId = yield* freshWorkspace;
          const channel = yield* siteChannel(workspaceId, site);
          const articles = yield* Articles;
          const actor = writer(workspaceId);

          const send = (title: string) =>
            articles.create(
              actor,
              {
                channelId: channel.id,
                content: content({
                  categories: ["Food & Drink"],
                  tags: ["R&D"],
                  title,
                }),
              },
              Option.some({ at: Option.none(), timeZone: zone })
            );

          yield* send("First");

          yield* eventually(
            "the first article is on the site",
            Effect.sync(() => site.posts().length === 1)
          );

          yield* send("Second");

          yield* eventually(
            "the second article is on the site",
            Effect.sync(() => site.posts().length === 2)
          );

          const [first, second] = site.posts();

          assert.deepStrictEqual(first?.categories, [food]);
          assert.deepStrictEqual(second?.categories, [food]);
          assert.lengthOf([...site.tags().keys()], 1);
          assert.deepStrictEqual(second?.tags, first?.tags);
        })
      )
  );
  it.effect("sends each file once, however many attempts it takes", () =>
    onArticles(
      Effect.gen(function* filesOnce() {
        let unavailable = 0;

        // The site is down for the first look for a tag, after the files.
        const site = yield* fakeWordPress({
          intercept: (request) => {
            const down =
              request.route === "/wp/v2/tags" &&
              request.method === "GET" &&
              unavailable === 0;

            unavailable += down ? 1 : 0;

            return down
              ? { body: "Service Unavailable", status: 503 }
              : undefined;
          },
        });

        const workspaceId = yield* freshWorkspace;
        const channel = yield* siteChannel(workspaceId, site);
        const articles = yield* Articles;
        const actor = writer(workspaceId);

        const article = yield* articles.create(
          actor,
          { channelId: channel.id, content: content() },
          Option.some({ at: Option.none(), timeZone: zone })
        );

        yield* eventuallyLater(
          "the article is on the site",
          Effect.sync(() => site.posts().length === 1)
        );

        assert.strictEqual(unavailable, 1);
        assert.lengthOf(site.media(), 2);

        yield* eventuallyLater(
          "the article is published",
          ArticleStore.use((store) => store.get(article.id)).pipe(
            Effect.map((found) =>
              Option.exists(found, ({ state }) => state._tag === "published")
            )
          )
        );

        // Changed on the site, it sends no file again.
        yield* articles.updateOnSite(
          actor,
          article.id,
          content({ title: "Spring sowing, revised" })
        );

        assert.lengthOf(site.media(), 2);
      })
    )
  );

  it.effect("is sent again when the site's name did not resolve for now", () =>
    onArticles(
      Effect.gen(function* lookupFailed() {
        let refusals = 0;

        yield* Ref.set(guardRefusal, () => {
          refusals += 1;

          return refusals === 1 ? Option.some("lookupFailed") : Option.none();
        });

        const site = yield* fakeWordPress();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* siteChannel(workspaceId, site);

        yield* (yield* Articles).create(
          writer(workspaceId),
          { channelId: channel.id, content: content() },
          Option.some({ at: Option.none(), timeZone: zone })
        );

        yield* eventuallyLater(
          "the article is on the site",
          Effect.sync(() => site.posts().length === 1)
        );
      }).pipe(Effect.ensuring(Ref.set(guardRefusal, () => Option.none())))
    )
  );

  it.effect(
    "fails, and is not left unconfirmed, when the guard refuses the post's call",
    () =>
      onArticles(
        Effect.gen(function* refusedCommit() {
          // Every call to the site's posts, the one that makes it first.
          yield* Ref.set(guardRefusal, (url) =>
            url.pathname.endsWith("/wp/v2/posts")
              ? Option.some("notPublic")
              : Option.none()
          );

          const { sent: article, site } = yield* sentTo();

          assert.strictEqual(stateOf(article), "failed");
          assert.lengthOf(site.posts(), 0);
        }).pipe(Effect.ensuring(Ref.set(guardRefusal, () => Option.none())))
      )
  );

  it.effect(
    "loses its cover and excerpt on the site when they are removed",
    () =>
      onArticles(
        Effect.gen(function* removedFields() {
          const { actor, sent: article, site } = yield* sentTo();

          yield* (yield* Articles).updateOnSite(
            actor,
            article.id,
            content({ coverMediaId: Option.none(), excerpt: Option.none() })
          );

          assert.strictEqual(site.posts()[0]?.featured_media, 0);
          assert.strictEqual(site.posts()[0]?.excerpt, "");
        })
      )
  );

  it.effect("says the site keeps no trash, when it does not", () =>
    onArticles(
      Effect.gen(function* noTrash() {
        const { actor, sent: article } = yield* sentTo({
          intercept: (request) =>
            request.method === "DELETE"
              ? {
                  body: {
                    code: "rest_trash_not_supported",
                    data: { status: 501 },
                    message: "The post does not support trashing.",
                  },
                  status: 501,
                }
              : undefined,
        });

        const refused = yield* (yield* Articles)
          .unpublish(actor, article.id)
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "BadRequest");
        assert.strictEqual(
          refused._tag === "BadRequest" ? refused.code : undefined,
          "rest_trash_not_supported"
        );
      })
    )
  );

  it.effect("keeps no address the site answers that is not a web page's", () =>
    onArticles(
      Effect.gen(function* badLink() {
        const { sent: article } = yield* sentTo({
          intercept: (request) =>
            request.route === "/wp/v2/posts" &&
            request.method === "POST" &&
            request.query.get("search") === null
              ? {
                  body: { id: 999, link: "data:text/html,synthetic" },
                  status: 201,
                }
              : undefined,
        });

        assert.strictEqual(stateOf(article), "published");
        assert.isTrue(
          article.state._tag === "published" &&
            article.state.permalink === undefined
        );
      })
    )
  );
  it.effect(
    "is made again by a run that stopped before the post's call, and looked for after it",
    () =>
      onArticles(
        Effect.gen(function* journal() {
          const site = yield* fakeWordPress();
          const workspaceId = yield* freshWorkspace;
          const channel = yield* siteChannel(workspaceId, site);
          const calls = yield* ArticleJournal;

          const article = yield* (yield* Articles).create(
            writer(workspaceId),
            { channelId: channel.id, content: content() },
            Option.none()
          );

          const startedAt = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

          const call = {
            articleId: article.id,
            attempt: 1,
            idempotencyKey: `${article.id}:synthetic:1`,
            round: 0,
            startedAt,
          };

          assert.strictEqual((yield* calls.begin(call))._tag, "started");
          assert.strictEqual((yield* calls.begin(call))._tag, "prepared");

          const committedAt = DateTime.makeUnsafe("2026-06-15T07:00:05Z");

          yield* calls.committing(call.idempotencyKey, committedAt);

          const again = yield* calls.begin(call);

          assert.strictEqual(again._tag, "inFlight");
          assert.isTrue(
            again._tag === "inFlight" &&
              DateTime.Equivalence(again.committedAt, committedAt)
          );
        })
      )
  );
  it.effect(
    "never takes a post another article's call answered, before that one settled",
    () =>
      onArticles(
        Effect.gen(function* answered() {
          const site = yield* fakeWordPress();
          const workspaceId = yield* freshWorkspace;
          const channel = yield* siteChannel(workspaceId, site);
          const calls = yield* ArticleJournal;

          const article = yield* (yield* Articles).create(
            writer(workspaceId),
            { channelId: channel.id, content: content() },
            Option.none()
          );

          const at = DateTime.makeUnsafe("2026-06-15T07:00:00Z");
          const key = `${article.id}:synthetic:1`;

          yield* calls.begin({
            articleId: article.id,
            attempt: 1,
            idempotencyKey: key,
            round: 0,
            startedAt: at,
          });
          yield* calls.finish(
            key,
            {
              _tag: "published",
              platformPostId: PlatformPostIdSchema.make("4242"),
            },
            at
          );

          const taken = yield* ArticleStore.use((store) =>
            store.recordedOn(channel.id, ["4242", "4343"])
          );

          assert.deepStrictEqual([...taken], ["4242"]);
        })
      )
  );
});
