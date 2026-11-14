import { Buffer } from "node:buffer";

// An article goes to a WordPress site through its job, as the site's REST
// API documents it: its files to the media library, its tags and
// categories by name, then the post, once; a lost answer is looked for
// and adopted, never sent again; a refused password marks the website to
// reconnect; once there, it is updated in place, or moved to the trash.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Option, Ref } from "effect";
import type { Layer, Scope } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ArticleStore } from "#publishing/application/article-store.ts";
import { Articles } from "#publishing/application/articles.ts";
import { ArticleContent } from "#publishing/domain/article-content.ts";
import type { Article } from "#publishing/domain/article.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { fakeWordPress } from "#test/channels/fakes/fake-wordpress.ts";
import type { FakeWordPressOptions } from "#test/channels/fakes/fake-wordpress.ts";
import { actorIn, freshWorkspace } from "#test/channels/support.ts";
import {
  ArticleServerTest,
  bodyImage,
  coverImage,
  siteChannel,
  toldArticles,
} from "#test/publishing/article-server.ts";
import {
  eventually,
  setTime,
} from "#test/publishing/infrastructure/harness.ts";

const zone = TimeZoneIdSchema.make("Europe/Paris");

const content = (fields: Partial<ArticleContent> = {}) =>
  new ArticleContent({
    body: {
      content: [
        {
          attrs: { level: 2 },
          content: [{ text: "Sow early", type: "text" }],
          type: "heading",
        },
        {
          content: [{ text: "Peas & beans <first>.", type: "text" }],
          type: "paragraph",
        },
        {
          attrs: { alt: "A row of peas", mediaId: bodyImage.media.mediaId },
          type: "image",
        },
      ],
      type: "doc",
    },
    categories: ["Uncategorized", "Vegetables"],
    coverMediaId: Option.some(coverImage.media.mediaId),
    excerpt: Option.some("What to sow first."),
    siteStatus: "publish",
    tags: ["peas", "spring"],
    title: "Spring sowing",
    ...fields,
  });

const writer = (workspaceId: Parameters<typeof actorIn>[0]) =>
  actorIn(workspaceId, [
    "channel:read",
    "post:read",
    "post:create",
    "post:update",
    "post:delete",
    "post:schedule",
    "post:publish",
  ]);

// The article, scheduled now on a fresh site's channel, once its job ended.
const sentTo = Effect.fn("test.sentTo")(function* sentTo(
  options: FakeWordPressOptions = {},
  fields: Partial<ArticleContent> = {},
  password?: string
) {
  const site = yield* fakeWordPress(options);
  const workspaceId = yield* freshWorkspace;
  const channel = yield* siteChannel(workspaceId, site, password);
  const articles = yield* Articles;
  const actor = writer(workspaceId);

  const article = yield* articles.create(
    actor,
    { channelId: channel.id, content: content(fields) },
    Option.some({ at: Option.none(), timeZone: zone })
  );

  yield* eventually(
    "the article is sent",
    ArticleStore.use((store) => store.get(article.id)).pipe(
      Effect.map((found) =>
        Option.exists(
          found,
          ({ state }) =>
            state._tag !== "scheduled" && state._tag !== "publishing"
        )
      )
    )
  );

  const sent = yield* ArticleStore.use((store) => store.get(article.id)).pipe(
    Effect.map(Option.getOrThrow)
  );

  return { actor, channelId: channel.id, sent, site, workspaceId };
});

const stateOf = (article: Article) => article.state._tag;

// Runs the test on a fresh server, built once the clock is set: built at
// the epoch, the cluster's timers would replay every second up to it.
const onArticles = <A, E>(
  test: Effect.Effect<
    A,
    E,
    Layer.Success<typeof ArticleServerTest> | Scope.Scope
  >
) =>
  setTime("2026-06-15T07:00:00Z").pipe(
    Effect.andThen(test.pipe(Effect.scoped, Effect.provide(ArticleServerTest)))
  );

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
});
