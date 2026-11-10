import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { PublishedTargets } from "#publishing/application/published-targets.ts";
import { DrizzlePublishedTargets } from "#publishing/infrastructure/drizzle-published-targets.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import type { PostId, PostTargetId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// The targets publishing lists for analytics, in Postgres. The rows are a
// workspace's own, at instants no other suite uses, and deleted after.

const ListingTest = DrizzlePublishedTargets.pipe(
  Layer.provideMerge(DatabaseTest)
);

const utc = (iso: string) => DateTime.makeUnsafe(iso);

interface TargetRow {
  readonly finishedAt: string | null;
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

    yield* sql`INSERT INTO publishing.post_targets (id, post_id, channel_id, status, finished_at, platform_post_id, permalink) VALUES (${targetId}, ${postId}, ${targetChannel}, ${target.status}, ${target.finishedAt === null ? null : utc(target.finishedAt).pipe(DateTime.toDateUtc)}, ${target.platformPostId}, ${target.platformPostId === null ? null : `https://mastodon.test/@alice/${target.platformPostId}`})`;

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
        assert.deepStrictEqual(own[1], {
          authorId: own[1]?.authorId,
          channelId,
          permalink: Option.some(
            "https://mastodon.test/@alice/110000000000000002"
          ),
          platformPostId: own[1]?.platformPostId,
          postId,
          publishedAt: utc("2045-02-01T10:00:00.000Z"),
          targetId: ids[0],
          workspaceId,
        });

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
});
