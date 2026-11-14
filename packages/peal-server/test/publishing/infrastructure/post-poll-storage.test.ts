import { readFile } from "node:fs/promises";
import path from "node:path";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PostRepository } from "#publishing/application/post-repository.ts";
import { Poll } from "#publishing/domain/poll.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { createDraft } from "#publishing/domain/post.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { newId } from "#shared/application/ids.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { PostId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// A post's poll is stored with it, in `publishing.posts.poll`, as JSON the
// domain's `Poll` decodes, null without one: persisted contract. Keep the
// fixture decoding, and add to it when a poll gains a field.

const StorageTest = DrizzlePostRepository.pipe(
  Layer.provideMerge(DatabaseTest)
);

const fixture = path.join(
  import.meta.dirname,
  "fixtures",
  "persisted",
  "posts",
  "polls.json"
);

const deletePost = (postId: PostId) =>
  SqlClient.SqlClient.use(
    (sql) => sql`DELETE FROM publishing.posts WHERE id = ${postId}`
  ).pipe(Effect.orDie);

layer(StorageTest)("a post's stored poll", (it) => {
  it.effect("decodes as this release writes it", () =>
    Effect.gen(function* decodesFixture() {
      const stored = yield* Effect.promise(
        async () => await readFile(fixture, "utf-8")
      );

      const decoded = yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(Schema.Array(Schema.NullOr(Poll)))
      )(stored);

      assert.deepStrictEqual(
        decoded.map((poll) => poll?.multipleChoice ?? null),
        [null, false, true]
      );
    })
  );

  it.effect("is kept with the post, and none on a post without", () =>
    Effect.gen(function* roundTrip() {
      const posts = yield* PostRepository;
      const workspaceId = yield* freshWorkspace;
      const asking = yield* newId(PostIdSchema);
      const plain = yield* newId(PostIdSchema);

      const content = new PostContent({
        media: [],
        overrides: [],
        poll: Option.some(
          new Poll({
            choices: ["Mornings", "Evenings"],
            durationMinutes: 60,
            multipleChoice: true,
          })
        ),
        text: "When do you read us?",
      });

      const without = new PostContent({
        media: [],
        overrides: [],
        text: "No question here",
      });

      yield* posts.insert(
        createDraft(asking, workspaceId, content, Option.none()),
        []
      );
      yield* posts.insert(
        createDraft(plain, workspaceId, without, Option.none()),
        []
      );

      yield* Effect.gen(function* checks() {
        const found = yield* posts.find(asking);
        const other = yield* posts.find(plain);

        assert.deepStrictEqual(
          found.pipe(Option.map(({ post }) => post.content)),
          Option.some(content)
        );
        assert.deepStrictEqual(
          other.pipe(Option.flatMap(({ post }) => post.content.poll)),
          Option.none()
        );

        const column = yield* SqlClient.SqlClient.use(
          (sql) =>
            sql<{
              readonly poll: unknown;
            }>`SELECT poll FROM publishing.posts WHERE id = ${plain}`
        ).pipe(Effect.orDie);

        assert.strictEqual(column[0]?.poll, null);
      }).pipe(
        Effect.ensuring(deletePost(asking)),
        Effect.ensuring(deletePost(plain))
      );
    })
  );
});
