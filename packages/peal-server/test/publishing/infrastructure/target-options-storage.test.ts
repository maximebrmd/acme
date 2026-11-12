import { readFile } from "node:fs/promises";
import path from "node:path";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PostRepository } from "#publishing/application/post-repository.ts";
import { emptyContent } from "#publishing/domain/post-content.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { createTarget, withOptions } from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { createDraft } from "#publishing/domain/post.ts";
import { TargetOptionsSchema } from "#publishing/domain/target-options.ts";
import { TikTokOptions } from "#publishing/domain/tiktok-options.ts";
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { PostId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// A target's options are stored with it, in `publishing.post_targets`, as
// JSON the domain's schema decodes. They are persisted contract: rows from
// before options were kept, and options as this release writes them, must
// keep decoding. Keep the fixture, and add to it when an option is added.

const StorageTest = DrizzlePostRepository.pipe(
  Layer.provideMerge(DatabaseTest)
);

const fixture = path.join(
  import.meta.dirname,
  "fixtures",
  "persisted",
  "post-targets",
  "options.json"
);

const deletePost = (postId: PostId) =>
  SqlClient.SqlClient.use(
    (sql) => sql`DELETE FROM publishing.posts WHERE id = ${postId}`
  ).pipe(Effect.orDie);

// Targets as the repository lists them: by id.
const byId = (targets: readonly PostTarget[]) =>
  targets.toSorted((one, other) => one.id.localeCompare(other.id));

const youTube = new YouTubeOptions({
  madeForKids: false,
  tags: ["launch"],
  title: "A synthetic launch video",
});

layer(StorageTest)("a target's stored options", (it) => {
  it.effect("decode as this release writes them", () =>
    Effect.gen(function* decodesFixtures() {
      const stored = yield* Effect.promise(
        async () => await readFile(fixture, "utf-8")
      );

      const decoded = yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(Schema.Array(TargetOptionsSchema))
      )(stored);

      assert.deepStrictEqual(
        decoded.map(({ platform }) => platform),
        [
          "youtube",
          "youtube",
          "youtube",
          "tiktok",
          "tiktok",
          "googleBusiness",
          "googleBusiness",
          "googleBusiness",
          "mastodon",
          "mastodon",
          "bluesky",
          "bluesky",
          "threads",
          "threads",
          "x",
          "x",
          "youtube",
          "tiktok",
          "tiktok",
          "instagram",
          "instagram",
          "facebook",
          "facebook",
          "instagram",
          "instagram",
          "facebook",
          "facebook",
          "facebook",
        ]
      );
    })
  );

  it.effect("are none on a row written before options were kept", () =>
    Effect.gen(function* olderRow() {
      const sql = yield* SqlClient.SqlClient;
      const workspaceId = yield* freshWorkspace;
      const postId = yield* newId(PostIdSchema);
      const targetId = yield* newId(PostTargetIdSchema);
      const channelId = yield* newId(ChannelIdSchema);

      // The columns an earlier release wrote, without `options`.
      yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text) VALUES (${postId}, ${workspaceId}, 'draft', 'A synthetic post')`;
      yield* sql`INSERT INTO publishing.post_targets (id, post_id, channel_id, status) VALUES (${targetId}, ${postId}, ${channelId}, 'pending')`;

      yield* Effect.gen(function* checks() {
        const posts = yield* PostRepository;
        const [target] = yield* posts.targets(postId);

        assert.strictEqual(target?.id, targetId);
        assert.deepStrictEqual(target?.options, Option.none());
      }).pipe(Effect.ensuring(deletePost(postId)));
    })
  );

  it.effect("are kept, replaced, and removed with their target", () =>
    Effect.gen(function* roundTrip() {
      const posts = yield* PostRepository;
      const sql = yield* SqlClient.SqlClient;
      const workspaceId = yield* freshWorkspace;
      const postId = yield* newId(PostIdSchema);

      const onYouTube = createTarget(
        yield* newId(PostTargetIdSchema),
        postId,
        yield* newId(ChannelIdSchema),
        Option.some(youTube)
      );

      const onMastodon = createTarget(
        yield* newId(PostTargetIdSchema),
        postId,
        yield* newId(ChannelIdSchema)
      );

      const post = createDraft(
        postId,
        workspaceId,
        emptyContent,
        Option.none()
      );

      yield* posts.insert(post, [onYouTube, onMastodon]);

      yield* Effect.gen(function* checks() {
        assert.deepStrictEqual(
          yield* posts.targets(postId),
          byId([onYouTube, onMastodon])
        );

        const stored = yield* sql<{
          readonly options: unknown;
        }>`SELECT options FROM publishing.post_targets WHERE id = ${onYouTube.id}`;

        assert.deepStrictEqual(stored, [
          {
            options: {
              madeForKids: false,
              platform: "youtube",
              tags: ["launch"],
              title: "A synthetic launch video",
            },
          },
        ]);

        // A draft's update gives the target it keeps other options.
        const retitled = withOptions(
          onYouTube,
          Option.some(
            new YouTubeOptions({ madeForKids: true, title: "Another title" })
          )
        );

        const onTikTok = createTarget(
          yield* newId(PostTargetIdSchema),
          postId,
          yield* newId(ChannelIdSchema),
          Option.some(new TikTokOptions({ privacyLevel: "SELF_ONLY" }))
        );

        yield* posts.setTargets(postId, [retitled, onTikTok]);

        assert.deepStrictEqual(
          yield* posts.targets(postId),
          byId([retitled, onTikTok])
        );

        const cleared = withOptions(retitled, Option.none());

        yield* posts.setTargets(postId, [cleared, onTikTok]);

        assert.deepStrictEqual(
          yield* posts.targets(postId),
          byId([cleared, onTikTok])
        );
      }).pipe(Effect.ensuring(deletePost(postId)));
    })
  );
});
