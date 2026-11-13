import { readFile } from "node:fs/promises";
import path from "node:path";

import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PostRepository } from "#publishing/application/post-repository.ts";
import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { createDraft } from "#publishing/domain/post.ts";
import { TextOverride } from "#publishing/domain/text-override.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  PostIdSchema,
} from "#shared/domain/ids.ts";
import type { PostId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// The parts that follow a post's first are stored with it, in
// `publishing.posts.follow_ups`, as JSON the domain's `PostPart` decodes.
// They are persisted contract: rows from before posts had parts, and parts
// as this release writes them, must keep decoding. Keep the fixture, and add
// to it when a part gains a field.

const StorageTest = DrizzlePostRepository.pipe(
  Layer.provideMerge(DatabaseTest)
);

const fixture = path.join(
  import.meta.dirname,
  "fixtures",
  "persisted",
  "posts",
  "follow-ups.json"
);

const overridesFixture = path.join(
  import.meta.dirname,
  "fixtures",
  "persisted",
  "posts",
  "text-overrides.json"
);

const deletePost = (postId: PostId) =>
  SqlClient.SqlClient.use(
    (sql) => sql`DELETE FROM publishing.posts WHERE id = ${postId}`
  ).pipe(Effect.orDie);

layer(StorageTest)("a post's stored parts", (it) => {
  it.effect("decode as this release writes them", () =>
    Effect.gen(function* decodesFixtures() {
      const stored = yield* Effect.promise(
        async () => await readFile(fixture, "utf-8")
      );

      const decoded = yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(Schema.Array(Schema.Array(PostPart)))
      )(stored);

      assert.deepStrictEqual(
        decoded.map((parts) => parts.map(({ delaySeconds }) => delaySeconds)),
        [[], [0], [300, 86_400]]
      );
    })
  );

  it.effect("keep the texts and media they have on channels", () =>
    Effect.gen(function* decodesOverrides() {
      const stored = yield* Effect.promise(
        async () => await readFile(overridesFixture, "utf-8")
      );

      const decoded = yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(Schema.Array(Schema.Array(TextOverride)))
      )(stored);

      assert.deepStrictEqual(
        decoded.map((overrides) =>
          overrides.map(({ media }) => media?.length ?? null)
        ),
        [[], [null], [1, 0]]
      );
    })
  );

  it.effect("read a target taken off its post as it was written", () =>
    Effect.gen(function* droppedRow() {
      const sql = yield* SqlClient.SqlClient;
      const workspaceId = yield* freshWorkspace;
      const postId = yield* newId(PostIdSchema);
      const targetId = yield* newId(PostIdSchema);
      const channelId = yield* newId(ChannelIdSchema);

      // The columns this release writes for a dropped target.
      yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text) VALUES (${postId}, ${workspaceId}, 'draft', 'A synthetic post')`;
      yield* sql`INSERT INTO publishing.post_targets (id, post_id, channel_id, status, finished_at, dropped) VALUES (${targetId}, ${postId}, ${channelId}, 'cancelled', '2026-06-15T07:00:00Z', true)`;

      yield* Effect.gen(function* checks() {
        const posts = yield* PostRepository;
        const [target] = yield* posts.targets(postId);

        assert.deepStrictEqual(target?.status, {
          _tag: "cancelled",
          cancelledAt: DateTime.makeUnsafe("2026-06-15T07:00:00Z"),
          dropped: true,
        });
      }).pipe(Effect.ensuring(deletePost(postId)));
    })
  );

  it.effect("are none on a row written before posts had parts", () =>
    Effect.gen(function* olderRow() {
      const sql = yield* SqlClient.SqlClient;
      const workspaceId = yield* freshWorkspace;
      const postId = yield* newId(PostIdSchema);

      // The columns an earlier release wrote, without `follow_ups`.
      yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text) VALUES (${postId}, ${workspaceId}, 'draft', 'A synthetic post')`;

      yield* Effect.gen(function* checks() {
        const posts = yield* PostRepository;
        const stored = yield* posts.find(postId);

        assert.deepStrictEqual(
          stored.pipe(Option.map(({ post }) => post.content)),
          Option.some(
            new PostContent({
              media: [],
              overrides: [],
              text: "A synthetic post",
            })
          )
        );
      }).pipe(Effect.ensuring(deletePost(postId)));
    })
  );

  it.effect("are kept in order, and found by the media they show", () =>
    Effect.gen(function* roundTrip() {
      const posts = yield* PostRepository;
      const workspaceId = yield* freshWorkspace;
      const postId = yield* newId(PostIdSchema);
      const channelId = yield* newId(ChannelIdSchema);

      const chart = new MediaAttachment({
        altText: "A synthetic chart",
        mediaId: yield* newId(MediaAssetIdSchema),
      });

      const content = new PostContent({
        followUps: [
          new PostPart({
            delaySeconds: 300,
            media: [chart],
            overrides: [new TextOverride({ channelId, text: "Shorter here" })],
            text: "A second part",
          }),
          new PostPart({
            delaySeconds: 0,
            media: [],
            overrides: [],
            text: "A third part",
          }),
        ],
        media: [],
        overrides: [],
        text: "A first part",
      });

      yield* posts.insert(
        createDraft(postId, workspaceId, content, Option.none()),
        []
      );

      yield* Effect.gen(function* checks() {
        const stored = yield* posts.find(postId);

        assert.deepStrictEqual(
          stored.pipe(Option.map(({ post }) => post.content)),
          Option.some(content)
        );

        const showing = yield* posts.showing(workspaceId, chart.mediaId, [
          "draft",
        ]);

        assert.deepStrictEqual(
          showing.map(({ id }) => id),
          [postId]
        );

        const other = yield* posts.showing(
          workspaceId,
          yield* newId(MediaAssetIdSchema),
          ["draft"]
        );

        assert.deepStrictEqual(other, []);
      }).pipe(Effect.ensuring(deletePost(postId)));
    })
  );
});
