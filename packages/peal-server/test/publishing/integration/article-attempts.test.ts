// How each attempt at sending an article runs, through its job: in its
// site's turn, within the workspace's plan, from what the journal holds
// of it, and with the site's terms as WordPress answers them.
import { assert, describe, it } from "@effect/vitest";
import {
  DateTime,
  Deferred,
  Duration,
  Effect,
  Fiber,
  Option,
  Ref,
} from "effect";
import { Sharding } from "effect/cluster";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ArticleJournal } from "#publishing/application/article-journal.ts";
import { ArticleSendTurns } from "#publishing/application/article-send-turns.ts";
import { ArticleStore } from "#publishing/application/article-store.ts";
import { Articles } from "#publishing/application/articles.ts";
import type { ArticleId } from "#publishing/domain/article-id.ts";
import { fakeWordPress } from "#test/channels/fakes/fake-wordpress.ts";
import { freshWorkspace } from "#test/channels/support.ts";
import { planChannels, siteChannel } from "#test/publishing/article-server.ts";
import {
  content,
  eventuallyLater,
  onArticles,
  sentTo,
  writer,
  zone,
} from "#test/publishing/article-support.ts";
import {
  eventually,
  setTime,
} from "#test/publishing/infrastructure/harness.ts";

const now = Option.some({ at: Option.none(), timeZone: zone });

const stateOf = (articleId: ArticleId) =>
  ArticleStore.use((store) => store.get(articleId)).pipe(
    Effect.map((found) =>
      Option.match(found, {
        onNone: () => "gone",
        onSome: ({ state }) => state._tag,
      })
    )
  );

// The post calls the site received: searches left out.
const madePosts = (site: {
  readonly requests: () => readonly {
    readonly method: string;
    readonly query: URLSearchParams;
    readonly route: string;
  }[];
}) =>
  site
    .requests()
    .filter(
      ({ method, query, route }) =>
        route === "/wp/v2/posts" &&
        method === "POST" &&
        query.get("search") === null
    ).length;

describe("an attempt at sending an article", () => {
  it.effect("waits while another holds its site's turn, then goes out", () =>
    onArticles(
      Effect.gen(function* turn() {
        const site = yield* fakeWordPress();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* siteChannel(workspaceId, site);
        const turns = yield* ArticleSendTurns;
        const sharding = yield* Sharding.Sharding;
        const held = yield* Deferred.make<boolean>();
        const release = yield* Deferred.make<boolean>();

        // Another attempt holds the site's turn, for as long as it takes.
        yield* turns
          .inTurn(
            channel.id,
            Deferred.succeed(held, true).pipe(
              Effect.andThen(Deferred.await(release))
            )
          )
          .pipe(Effect.forkScoped);

        yield* Deferred.await(held);

        const article = yield* (yield* Articles).create(
          writer(workspaceId),
          { channelId: channel.id, content: content() },
          now
        );

        // Minutes pass: nothing goes out, and nothing fails.
        for (let round = 0; round < 30; round += 1) {
          yield* sharding.pollStorage;
          yield* TestClock.adjust(Duration.seconds(10));
          yield* TestClock.withLive(Effect.sleep(Duration.millis(10)));
        }

        assert.strictEqual(madePosts(site), 0);
        assert.strictEqual(yield* stateOf(article.id), "publishing");

        yield* Deferred.succeed(release, true);

        yield* eventuallyLater(
          "the article is published",
          stateOf(article.id).pipe(Effect.map((state) => state === "published"))
        );

        assert.strictEqual(madePosts(site), 1);
      })
    )
  );

  it.effect("sends nothing once the workspace is over its plan", () =>
    onArticles(
      Effect.gen(function* overPlan() {
        const site = yield* fakeWordPress();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* siteChannel(workspaceId, site);

        const article = yield* (yield* Articles).create(
          writer(workspaceId),
          { channelId: channel.id, content: content() },
          Option.some({
            at: Option.some(DateTime.makeUnsafe("2026-06-15T09:00:00Z")),
            timeZone: zone,
          })
        );

        // Over its plan by the time it is due.
        yield* Ref.set(planChannels, { allowed: Option.some(2), connected: 3 });

        const ended = yield* setTime("2026-06-15T09:00:01Z").pipe(
          Effect.andThen(
            eventually(
              "the article failed",
              stateOf(article.id).pipe(
                Effect.map((state) => state === "failed")
              )
            )
          ),
          Effect.andThen(ArticleStore.use((store) => store.get(article.id))),
          Effect.ensuring(
            Ref.set(planChannels, { allowed: Option.none(), connected: 1 })
          )
        );

        const { state } = Option.getOrThrow(ended);

        assert.strictEqual(
          state._tag === "failed" ? state.code : undefined,
          "planLimit"
        );
        assert.lengthOf(site.requests(), 0);
      })
    )
  );

  it.effect("is made again when a run stopped before the post's call", () =>
    onArticles(
      Effect.gen(function* prepared() {
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

        // An earlier run began its first attempt, then stopped.
        const startedAt = yield* DateTime.now;

        yield* ArticleJournal.use((calls) =>
          calls.begin({
            articleId: draft.id,
            attempt: 1,
            idempotencyKey: `${draft.id}:synthetic:1`,
            round: draft.round,
            startedAt,
          })
        );

        yield* articles.schedule(actor, draft.id, {
          at: Option.none(),
          timeZone: zone,
        });

        yield* eventually(
          "the article is published",
          stateOf(draft.id).pipe(Effect.map((state) => state === "published"))
        );

        assert.strictEqual(madePosts(site), 1);
      })
    )
  );

  it.effect("records when the post's call left", () =>
    onArticles(
      Effect.gen(function* committing() {
        const { sent } = yield* sentTo();
        const sql = yield* SqlClient.SqlClient;

        const rows = yield* sql<{ readonly committed: boolean }>`
          SELECT committed_at IS NOT NULL AS committed
          FROM publishing.article_calls
          WHERE article_id = ${sent.id}`;

        assert.deepStrictEqual(
          rows.map(({ committed }) => committed),
          [true]
        );
      })
    )
  );

  it.effect(
    "takes a term the site's search answers with its name encoded",
    () =>
      onArticles(
        Effect.gen(function* decoded() {
          let food = 0;

          const { site } = yield* sentTo(
            { searchesDisplayedNames: true },
            { categories: ["Food & Drink"] },
            undefined,
            (made) => {
              food = made.addCategory("Food & Drink");
            }
          );

          assert.deepStrictEqual(site.posts()[0]?.categories, [food]);
          assert.isFalse(
            site
              .requests()
              .some(
                ({ method, route }) =>
                  route === "/wp/v2/categories" && method === "POST"
              )
          );
        })
      )
  );

  it.effect(
    "looks for the post of a call that may have reached the site, whatever the plan",
    () =>
      onArticles(
        Effect.gen(function* inFlight() {
          const site = yield* fakeWordPress();
          const workspaceId = yield* freshWorkspace;
          const channel = yield* siteChannel(workspaceId, site);
          const articles = yield* Articles;
          const actor = writer(workspaceId);
          const calls = yield* ArticleJournal;

          const draft = yield* articles.create(
            actor,
            { channelId: channel.id, content: content() },
            Option.none()
          );

          // An earlier run made the post's call, then stopped; the
          // workspace went over its plan since.
          const key = `${draft.id}:synthetic:1`;
          const startedAt = yield* DateTime.now;

          yield* calls.begin({
            articleId: draft.id,
            attempt: 1,
            idempotencyKey: key,
            round: draft.round,
            startedAt,
          });
          yield* calls.committing(key, startedAt);

          yield* articles.schedule(actor, draft.id, {
            at: Option.none(),
            timeZone: zone,
          });

          const ended = yield* Ref.set(planChannels, {
            allowed: Option.some(2),
            connected: 3,
          }).pipe(
            Effect.andThen(
              eventually(
                "the article ended",
                stateOf(draft.id).pipe(
                  Effect.map(
                    (state) => state !== "scheduled" && state !== "publishing"
                  )
                )
              )
            ),
            Effect.andThen(stateOf(draft.id)),
            Effect.ensuring(
              Ref.set(planChannels, { allowed: Option.none(), connected: 1 })
            )
          );

          // Looked for, not found: to check, never failed for the plan.
          assert.strictEqual(ended, "unconfirmed");
          assert.strictEqual(madePosts(site), 0);
        })
      )
  );

  it.effect("gives its site's turn back when the attempt is interrupted", () =>
    onArticles(
      Effect.gen(function* interrupted() {
        const site = yield* fakeWordPress();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* siteChannel(workspaceId, site);
        const turns = yield* ArticleSendTurns;
        const held = yield* Deferred.make<boolean>();

        const holder = yield* turns
          .inTurn(
            channel.id,
            Deferred.succeed(held, true).pipe(Effect.andThen(Effect.never))
          )
          .pipe(Effect.forkScoped);

        yield* Deferred.await(held);

        assert.isTrue(
          Option.isNone(yield* turns.inTurn(channel.id, Effect.void))
        );

        yield* Fiber.interrupt(holder);

        assert.isTrue(
          Option.isSome(yield* turns.inTurn(channel.id, Effect.void))
        );
      })
    )
  );
});
