import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result } from "effect";
import { SqlClient } from "effect/sql";

import { LivePostChangeStore } from "#publishing/application/live-post-change-store.ts";
import { LivePostChangeIdSchema } from "#publishing/domain/live-post-change-id.ts";
import {
  failChange,
  partRemoved,
  requestUnpublish,
} from "#publishing/domain/live-post-change.ts";
import { DrizzleLivePostChangeStore } from "#publishing/infrastructure/drizzle-live-post-change-store.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  UserIdSchema,
} from "#shared/domain/ids.ts";
import type { PostId } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// The changes asked of live posts, in Postgres, under a workspace of the
// test's own, deleted after.

const StoreTest = DrizzleLivePostChangeStore.pipe(
  Layer.provideMerge(DatabaseTest)
);

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const now = utc("2045-03-01T10:00:00.000Z");

const parts = [
  { index: 1, platformPostId: PlatformPostIdSchema.make("2") },
  { index: 0, platformPostId: PlatformPostIdSchema.make("1") },
];

// A finished post published on two channels.
const publishedPost = Effect.fn("test.publishedPost")(
  function* publishedPost() {
    const sql = yield* SqlClient.SqlClient;
    const workspaceId = yield* freshWorkspace;
    const postId = yield* newId(PostIdSchema);

    yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text) VALUES (${postId}, ${workspaceId}, 'finished', 'A synthetic post')`;

    const targets = [];

    for (const _ of [0, 1]) {
      const targetId = yield* newId(PostTargetIdSchema);
      const channelId = yield* newId(ChannelIdSchema);

      yield* sql`INSERT INTO publishing.post_targets (id, post_id, channel_id, status, finished_at, listed_at, platform_post_id) VALUES (${targetId}, ${postId}, ${channelId}, 'published', ${DateTime.toDateUtc(now)}, ${DateTime.toDateUtc(now)}, '1')`;

      targets.push({ channelId, targetId });
    }

    return { postId, targets, workspaceId };
  }
);

const deletePost = (postId: PostId) =>
  SqlClient.SqlClient.use(
    (sql) => sql`DELETE FROM publishing.posts WHERE id = ${postId}`
  ).pipe(Effect.orDie);

const changeOn = Effect.fn("test.changeOn")(function* changeOn(
  post: Effect.Success<ReturnType<typeof publishedPost>>,
  on: number,
  at: DateTime.Utc = now
) {
  const target = post.targets[on];

  if (target === undefined) {
    return yield* Effect.die("No such target");
  }

  return requestUnpublish({
    channelId: target.channelId,
    id: yield* newId(LivePostChangeIdSchema),
    now: at,
    parts,
    postId: post.postId,
    requestedBy: Option.some(
      UserIdSchema.make("3f1c2a7e-5b9d-4e8f-a1c3-6d2b9e7f4a10")
    ),
    requestedVia: Option.some({
      _tag: "apiKey",
      apiKeyId: "synthetic-key",
      name: "Synthetic",
    }),
    targetId: target.targetId,
    workspaceId: post.workspaceId,
  });
});

layer(StoreTest)("the live post changes", (it) => {
  it.effect("keep one pending change a target, and decode as written", () =>
    Effect.gen(function* oneAtATime() {
      const post = yield* publishedPost();

      yield* Effect.gen(function* checks() {
        const store = yield* LivePostChangeStore;
        const first = yield* changeOn(post, 0);
        const second = yield* changeOn(post, 0);

        assert.isTrue(yield* store.insert(first));
        assert.isFalse(yield* store.insert(second));
        assert.deepStrictEqual(yield* store.find(first.id), Option.some(first));
        assert.deepStrictEqual(
          yield* store.latestOf(first.targetId),
          Option.some(first)
        );

        // Once it ended, another may be asked.
        const failed = Result.getOrThrow(failChange(first, "unavailable", now));

        assert.isTrue(yield* store.update(failed, first));
        assert.isFalse(yield* store.update(failed, first));
        assert.isTrue(yield* store.insert(second));
        assert.deepStrictEqual(
          (yield* store.ofPost(post.workspaceId, post.postId)).map(
            ({ id }) => id
          ),
          [second.id, first.id]
        );
      }).pipe(Effect.ensuring(deletePost(post.postId)));
    })
  );

  it.effect("journal each call, which an erasure sees in flight", () =>
    Effect.gen(function* journal() {
      const post = yield* publishedPost();

      yield* Effect.gen(function* checks() {
        const store = yield* LivePostChangeStore;
        const change = yield* changeOn(post, 1);

        yield* store.insert(change);

        assert.deepStrictEqual(yield* store.lockOpen(post.workspaceId), [
          { changeId: change.id, inFlight: false },
        ]);
        assert.isTrue(yield* store.beginCall(change.id, now));
        assert.deepStrictEqual(yield* store.lockOpen(post.workspaceId), [
          { changeId: change.id, inFlight: true },
        ]);

        yield* store.endCall(change.id, now);

        assert.deepStrictEqual(yield* store.lockOpen(post.workspaceId), [
          { changeId: change.id, inFlight: false },
        ]);

        const removed = Result.getOrThrow(partRemoved(change, 1, true));

        yield* store.update(removed, change);

        assert.deepStrictEqual(
          yield* store.find(change.id),
          Option.some(removed)
        );

        const failed = Result.getOrThrow(failChange(removed, "x", now));

        yield* store.update(failed, removed);

        // Nothing is called for a change that ended.
        assert.isFalse(yield* store.beginCall(change.id, now));
        assert.deepStrictEqual(yield* store.lockOpen(post.workspaceId), []);
      }).pipe(Effect.ensuring(deletePost(post.postId)));
    })
  );

  it.effect("go with their target", () =>
    Effect.gen(function* cascade() {
      const post = yield* publishedPost();
      const store = yield* LivePostChangeStore;
      const change = yield* changeOn(post, 0);

      yield* store.insert(change);
      yield* deletePost(post.postId);

      assert.deepStrictEqual(yield* store.find(change.id), Option.none());
    })
  );
});
