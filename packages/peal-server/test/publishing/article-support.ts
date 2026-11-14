// What the articles' integration tests share: an article's content, a
// member who may do everything with it, and the article sent to a fresh
// site on a fresh server.
import { assert } from "@effect/vitest";
import { Duration, Effect, Option } from "effect";
import type { Layer, Scope } from "effect";
import { Sharding } from "effect/cluster";
import { TestClock } from "effect/testing";

import { ArticleStore } from "#publishing/application/article-store.ts";
import { Articles } from "#publishing/application/articles.ts";
import { ArticleContent } from "#publishing/domain/article-content.ts";
import type { Article } from "#publishing/domain/article.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { fakeWordPress } from "#test/channels/fakes/fake-wordpress.ts";
import type {
  FakeWordPress,
  FakeWordPressOptions,
} from "#test/channels/fakes/fake-wordpress.ts";
import { actorIn, freshWorkspace } from "#test/channels/support.ts";
import {
  ArticleServerTest,
  bodyImage,
  coverImage,
  siteChannel,
} from "#test/publishing/article-server.ts";
import {
  eventually,
  setTime,
} from "#test/publishing/infrastructure/harness.ts";

export const zone = TimeZoneIdSchema.make("Europe/Paris");

export const content = (fields: Partial<ArticleContent> = {}) =>
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

export const writer = (workspaceId: Parameters<typeof actorIn>[0]) =>
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
export const sentTo = Effect.fn("test.sentTo")(function* sentTo(
  options: FakeWordPressOptions = {},
  fields: Partial<ArticleContent> = {},
  password?: string,
  // What the site holds already, before the article is sent.
  prepare?: (site: FakeWordPress) => void
) {
  const site = yield* fakeWordPress(options);

  prepare?.(site);

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

export const stateOf = (article: Article) => article.state._tag;

// Runs the test on a fresh server, built once the clock is set: built at
// the epoch, the cluster's timers would replay every second up to it.
export const onArticles = <A, E>(
  test: Effect.Effect<
    A,
    E,
    Layer.Success<typeof ArticleServerTest> | Scope.Scope
  >
) =>
  setTime("2026-06-15T07:00:00Z").pipe(
    Effect.andThen(test.pipe(Effect.scoped, Effect.provide(ArticleServerTest)))
  );

/**
 * Waits until `condition` holds, moving the virtual clock a second a
 * round: for what waits on a retry's delay, never past its deadlines
 * while the machine is slow.
 */
export const eventuallyLater = <E, R>(
  label: string,
  condition: Effect.Effect<boolean, E, R>
) =>
  Effect.gen(function* waitingLater() {
    const sharding = yield* Sharding.Sharding;

    for (let round = 0; round < 3000; round += 1) {
      if (yield* condition) {
        return;
      }

      yield* sharding.pollStorage;
      yield* TestClock.adjust(Duration.seconds(1));
      yield* TestClock.withLive(Effect.sleep(Duration.millis(10)));
    }

    assert.fail(`Timed out waiting until ${label}`);
  });
