import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result } from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { PostRepository } from "#publishing/application/post-repository.ts";
import { PublishedTargets } from "#publishing/application/published-targets.ts";
import type { PublishedTarget } from "#publishing/application/published-targets.ts";
import {
  confirmPublished,
  recordLivePart,
  settleTarget,
  startTarget,
} from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { DrizzlePublishedTargets } from "#publishing/infrastructure/drizzle-published-targets.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import type { PostId, PostTargetId } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// The targets publishing lists for analytics, in Postgres. The rows are a
// workspace's own, at instants no other suite uses, and deleted after.

const ListingTest = Layer.mergeAll(
  DrizzlePublishedTargets,
  DrizzlePostRepository
).pipe(Layer.provideMerge(DatabaseTest));

const utc = (iso: string) => DateTime.makeUnsafe(iso);

interface TargetRow {
  readonly finishedAt: string | null;
  /** The target's options, as JSON; none when left out. */
  readonly options?: string;
  readonly platformPostId: string | null;
  readonly status: string;
}

// A finished post with targets as given, written as publishing writes them.
const insertPost = Effect.fn("test.insertPost")(function* insertPost(
  targets: readonly TargetRow[]
) {
  const sql = yield* SqlClient.SqlClient;
  const workspaceId = yield* freshWorkspace;
  const postId = yield* newId(PostIdSchema);
  const channelId = yield* newId(ChannelIdSchema);

  yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text) VALUES (${postId}, ${workspaceId}, 'finished', 'A synthetic post')`;

  const ids: PostTargetId[] = [];

  for (const [index, target] of targets.entries()) {
    const targetId = yield* newId(PostTargetIdSchema);

    // Each target on a channel of its own, as one post has one per channel.
    const targetChannel =
      index === 0 ? channelId : yield* newId(ChannelIdSchema);

    const finishedAt =
      target.finishedAt === null
        ? null
        : utc(target.finishedAt).pipe(DateTime.toDateUtc);

    // A published target is listed from when it went live.
    const listedAt = target.status === "published" ? finishedAt : null;

    yield* sql`INSERT INTO publishing.post_targets (id, post_id, channel_id, status, finished_at, listed_at, platform_post_id, permalink, options) VALUES (${targetId}, ${postId}, ${targetChannel}, ${target.status}, ${finishedAt}, ${listedAt}, ${target.platformPostId}, ${target.platformPostId === null ? null : `https://mastodon.test/@alice/${target.platformPostId}`}, ${target.options ?? null}::jsonb)`;

    ids.push(targetId);
  }

  return { channelId, ids, postId, workspaceId };
});

const deletePost = (postId: PostId) =>
  SqlClient.SqlClient.use(
    (sql) => sql`DELETE FROM publishing.posts WHERE id = ${postId}`
  ).pipe(Effect.orDie);

layer(ListingTest)("the published targets", (it) => {
  it.effect("are listed in the order they went live, with ids only", () =>
    Effect.gen(function* listed() {
      const { channelId, ids, postId, workspaceId } = yield* insertPost([
        {
          finishedAt: "2045-02-01T10:00:00.000Z",
          platformPostId: "110000000000000002",
          status: "published",
        },
        {
          finishedAt: "2045-02-01T09:00:00.000Z",
          platformPostId: "110000000000000001",
          status: "published",
        },
        // Confirmed by hand: nothing to read it back with.
        {
          finishedAt: "2045-02-01T09:30:00.000Z",
          platformPostId: null,
          status: "published",
        },
        {
          finishedAt: "2045-02-01T09:45:00.000Z",
          platformPostId: null,
          status: "failed",
        },
      ]);

      yield* Effect.gen(function* checks() {
        const published = yield* PublishedTargets;

        const all = yield* published.from(
          {
            publishedAt: utc("2045-02-01T00:00:00.000Z"),
            targetId: Option.none(),
          },
          100
        );

        const own = all.filter(({ targetId }) => ids.includes(targetId));

        assert.deepStrictEqual(
          own.map(({ platformPostId, targetId }) => [targetId, platformPostId]),
          [
            [ids[1], "110000000000000001"],
            [ids[0], "110000000000000002"],
          ]
        );
        const [, second] = own;

        assert.isDefined(second);
        assert.deepStrictEqual(second, {
          authorId: second.authorId,
          channelId,
          format: Option.none(),
          permalink: Option.some(
            "https://mastodon.test/@alice/110000000000000002"
          ),
          platformPostId: second.platformPostId,
          postId,
          publishedAt: utc("2045-02-01T10:00:00.000Z"),
          targetId: second.targetId,
          workspaceId,
        });
        assert.strictEqual(second.targetId, ids[0]);

        // From a target on: those after it.
        const after = yield* published.from(
          {
            publishedAt: utc("2045-02-01T09:00:00.000Z"),
            targetId: Option.fromUndefinedOr(ids[1]),
          },
          100
        );

        assert.deepStrictEqual(
          after
            .filter(({ targetId }) => ids.includes(targetId))
            .map(({ targetId }) => targetId),
          [ids[0]]
        );
      }).pipe(Effect.ensuring(deletePost(postId)));
    })
  );

  it.effect(
    "carry their format, and leave out those of formats a reader skips, in full pages",
    () =>
      Effect.gen(function* formats() {
        const story = '{"format":"story","platform":"instagram"}';

        const { ids, postId } = yield* insertPost([
          ...["10:00", "10:01", "10:02"].map((time, index) => ({
            finishedAt: `2046-03-01T${time}:00.000Z`,
            options: story,
            platformPostId: `17900000000000000${index}`,
            status: "published",
          })),
          {
            finishedAt: "2046-03-01T10:03:00.000Z",
            options: '{"format":"feed","platform":"instagram"}',
            platformPostId: "179000000000000009",
            status: "published",
          },
          {
            finishedAt: "2046-03-01T10:04:00.000Z",
            options: '{"format":"reel","platform":"facebook"}',
            platformPostId: "179000000000000010",
            status: "published",
          },
        ]);

        yield* Effect.gen(function* checks() {
          const published = yield* PublishedTargets;

          const cursor = {
            publishedAt: utc("2046-03-01T00:00:00.000Z"),
            targetId: Option.none(),
          };

          const own = (found: readonly PublishedTarget[]) =>
            found.filter(({ targetId }) => ids.includes(targetId));

          const all = own(yield* published.from(cursor, 100));

          assert.deepStrictEqual(
            all.map(({ format }) => Option.getOrNull(format)),
            ["story", "story", "story", null, "reel"]
          );

          // A page as long as asked, past every story: the feed post and
          // the reel come first, so a reader that stops at a short page
          // never misses them.
          const page = yield* published.from(cursor, 2, ["story"]);

          assert.deepStrictEqual(
            own(page).map(({ targetId }) => targetId),
            [ids[3], ids[4]]
          );
        }).pipe(Effect.ensuring(deletePost(postId)));
      })
  );

  it.effect("are told apart by id when they went live at once", () =>
    Effect.gen(function* together() {
      const { ids, postId } = yield* insertPost(
        Array.from({ length: 3 }, (_, index) => ({
          finishedAt: "2045-02-02T10:00:00.000Z",
          platformPostId: `11000000000000001${index}`,
          status: "published",
        }))
      );

      yield* Effect.gen(function* checks() {
        const published = yield* PublishedTargets;
        const [first, second, third] = ids.toSorted();

        const listed = (targetId: Option.Option<PostTargetId>) =>
          published
            .from(
              { publishedAt: utc("2045-02-02T10:00:00.000Z"), targetId },
              100
            )
            .pipe(
              Effect.map((found) =>
                found
                  .map(({ targetId: id }) => id)
                  .filter((id) => ids.includes(id))
              )
            );

        assert.deepStrictEqual(yield* listed(Option.none()), [
          first,
          second,
          third,
        ]);
        assert.deepStrictEqual(yield* listed(Option.fromUndefinedOr(first)), [
          second,
          third,
        ]);
        assert.deepStrictEqual(
          yield* listed(Option.fromUndefinedOr(third)),
          []
        );
      }).pipe(Effect.ensuring(deletePost(postId)));
    })
  );

  it.effect(
    "list a post of several parts as its first part, from when a member confirmed its last",
    () =>
      Effect.gen(function* confirmedLate() {
        const { ids, postId } = yield* insertPost([
          { finishedAt: null, platformPostId: null, status: "pending" },
        ]);

        yield* Effect.gen(function* checks() {
          const posts = yield* PostRepository;
          const published = yield* PublishedTargets;
          const [targetId] = ids;

          const stored = (yield* posts.targets(postId)).find(
            ({ id }) => id === targetId
          );

          assert.isDefined(stored);

          // The first part went live, and the second left without an
          // answer: the target is unconfirmed, its first part kept. That
          // was years ago, as far as those who follow publications go.
          const attemptedAt = utc("2019-02-03T10:00:00.000Z");

          const started = Result.getOrThrow(startTarget(stored, attemptedAt));

          const first = Result.getOrThrow(
            recordLivePart(started, {
              index: 0,
              permalink: Option.some("https://mastodon.test/@alice/1101"),
              platformPostId: Option.some(PlatformPostIdSchema.make("1101")),
              publishedAt: attemptedAt,
              round: 1,
            })
          );

          const unconfirmed = Result.getOrThrow(
            settleTarget(
              first,
              { _tag: "unconfirmed", attemptedAt, reason: "noResponse" },
              attemptedAt
            )
          );

          assert.isTrue(yield* posts.updateTarget(started, stored));
          assert.isTrue(yield* posts.updateTarget(unconfirmed, started));

          const since = (at: DateTime.Utc) =>
            published
              .from({ publishedAt: at, targetId: Option.none() }, 100)
              .pipe(
                Effect.map((found) =>
                  found.filter((listed) => listed.targetId === targetId)
                )
              );

          // Not live as a whole yet: nothing to follow.
          assert.deepStrictEqual(yield* since(attemptedAt), []);

          // A member finds the second part on the platform, now. The post
          // went live when it was attempted, and those that follow
          // publications are well past that instant.
          const confirmedAt = yield* TestClock.withLive(DateTime.now);

          const confirmed = Result.getOrThrow(
            confirmPublished(unconfirmed, {
              now: confirmedAt,
              parts: 2,
              permalink: Option.none(),
              platformPostId: Option.none(),
            })
          );

          assert(confirmed.status._tag === "published");
          assert.deepStrictEqual(confirmed.status.publishedAt, attemptedAt);
          assert.isTrue(
            yield* TestClock.withLive(
              posts.updateTarget(confirmed, unconfirmed)
            )
          );

          // Listed from when Peal knew, as its first part: a follower
          // that reads on from a minute ago finds it.
          const [listed] = yield* since(
            DateTime.subtractDuration(confirmedAt, "1 minute")
          );

          assert.isDefined(listed);
          assert.strictEqual(listed.platformPostId, "1101");
          assert.deepStrictEqual(
            listed.permalink,
            Option.some("https://mastodon.test/@alice/1101")
          );
          assert.isTrue(
            DateTime.isGreaterThanOrEqualTo(listed.publishedAt, confirmedAt)
          );

          // Read back, the post still went live when it was attempted.
          const kept = (yield* posts.targets(postId)).find(
            ({ id }) => id === targetId
          );

          assert(kept?.status._tag === "published");
          assert.deepStrictEqual(kept.status.publishedAt, attemptedAt);
        }).pipe(Effect.ensuring(deletePost(postId)));
      })
  );

  it.effect(
    "list a post of several parts once, as its first part, and not one that stopped midway",
    () =>
      Effect.gen(function* threads() {
        const { ids, postId } = yield* insertPost([
          { finishedAt: null, platformPostId: null, status: "pending" },
          { finishedAt: null, platformPostId: null, status: "pending" },
        ]);

        yield* Effect.gen(function* checks() {
          const posts = yield* PostRepository;
          const published = yield* PublishedTargets;
          const sentAt = utc("2045-02-04T10:00:00.000Z");
          const stored = yield* posts.targets(postId);

          const partsLive = (target: PostTarget, count: number) => {
            let sending = Result.getOrThrow(startTarget(target, sentAt));

            for (let index = 0; index < count; index += 1) {
              sending = Result.getOrThrow(
                recordLivePart(sending, {
                  index,
                  permalink: Option.some(
                    `https://mastodon.test/@alice/${String(1201 + index)}`
                  ),
                  platformPostId: Option.some(
                    PlatformPostIdSchema.make(String(1201 + index))
                  ),
                  publishedAt: sentAt,
                  round: 1,
                })
              );
            }

            return sending;
          };

          const [whole, stopped] = ids.map((id) =>
            stored.find((target) => target.id === id)
          );

          assert.isDefined(whole);
          assert.isDefined(stopped);

          // Three parts, all live: the platform's answer names the last.
          const sent = partsLive(whole, 3);

          yield* posts.updateTarget(
            Result.getOrThrow(startTarget(whole, sentAt)),
            whole
          );
          yield* posts.updateTarget(
            Result.getOrThrow(
              settleTarget(
                sent,
                {
                  _tag: "published",
                  platformPostId: PlatformPostIdSchema.make("1203"),
                },
                sentAt
              )
            ),
            sent
          );

          // Two parts live, then the third refused: its first parts are on
          // the platform, and the target is not published.
          const midway = partsLive(stopped, 2);

          yield* posts.updateTarget(
            Result.getOrThrow(startTarget(stopped, sentAt)),
            stopped
          );
          yield* posts.updateTarget(
            Result.getOrThrow(
              settleTarget(
                midway,
                { _tag: "failed", reason: "contentRejected" },
                sentAt
              )
            ),
            midway
          );

          const listed = (yield* published.from(
            { publishedAt: sentAt, targetId: Option.none() },
            100
          )).filter(({ targetId }) => ids.includes(targetId));

          // One row for the post on its channel, whatever its parts: what
          // analytics counts, and bills on X, and the inbox reads under.
          assert.deepStrictEqual(
            listed.map(
              ({ permalink, platformPostId, publishedAt, targetId }) => ({
                permalink,
                platformPostId,
                publishedAt,
                targetId,
              })
            ),
            [
              {
                permalink: Option.some("https://mastodon.test/@alice/1201"),
                platformPostId: "1201",
                publishedAt: sentAt,
                targetId: whole.id,
              },
            ]
          );
        }).pipe(Effect.ensuring(deletePost(postId)));
      })
  );

  it.effect(
    "leave out a target deleted from its platform, which stays published",
    () =>
      Effect.gen(function* removed() {
        const { ids, postId, workspaceId } = yield* insertPost([
          {
            finishedAt: "2045-02-05T10:00:00.000Z",
            platformPostId: "110000000000000501",
            status: "published",
          },
          {
            finishedAt: "2045-02-05T10:05:00.000Z",
            platformPostId: "110000000000000502",
            status: "published",
          },
        ]);

        const [kept, gone] = ids;

        if (kept === undefined || gone === undefined) {
          return yield* Effect.die("Two targets were made");
        }

        return yield* Effect.gen(function* checks() {
          const published = yield* PublishedTargets;
          const posts = yield* PostRepository;
          const removedAt = utc("2045-02-06T08:00:00.000Z");

          assert.isTrue(yield* posts.markRemoved(gone, removedAt));
          // Once: a target removed is not removed again.
          assert.isFalse(yield* posts.markRemoved(gone, removedAt));

          const listed = (yield* published.from(
            {
              publishedAt: utc("2045-02-05T00:00:00.000Z"),
              targetId: Option.none(),
            },
            100
          )).filter(({ targetId }) => ids.includes(targetId));

          assert.deepStrictEqual(
            listed.map(({ targetId }) => targetId),
            [kept]
          );
          assert.deepStrictEqual(
            (yield* published.ofPost(workspaceId, postId)).map(
              ({ targetId }) => targetId
            ),
            [kept]
          );
          assert.deepStrictEqual(
            (yield* published.byPlatformPostIds(workspaceId, [
              "110000000000000501",
              "110000000000000502",
            ])).map(({ targetId }) => targetId),
            [kept]
          );

          const target = (yield* posts.targets(postId)).find(
            ({ id }) => id === gone
          );

          assert.strictEqual(target?.status._tag, "published");
          assert.deepStrictEqual(
            target?.status._tag === "published"
              ? target.status.removedAt
              : undefined,
            removedAt
          );
        }).pipe(Effect.ensuring(deletePost(postId)));
      })
  );
});
