import { Buffer } from "node:buffer";

// An article goes to a WordPress site through its job, as the site's REST
// API documents it: its files to the media library, its tags and
// categories by name, then the post, once; a lost answer is looked for
// and adopted, never sent again; a refused password marks the website to
// reconnect; once there, it is updated in place, or moved to the trash.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Option, Ref } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { Articles } from "#publishing/application/articles.ts";
import { fakeWordPress } from "#test/channels/fakes/fake-wordpress.ts";
import { freshWorkspace } from "#test/channels/support.ts";
import {
  bodyImage,
  coverImage,
  siteChannel,
  toldArticles,
} from "#test/publishing/article-server.ts";
import {
  content,
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
});
