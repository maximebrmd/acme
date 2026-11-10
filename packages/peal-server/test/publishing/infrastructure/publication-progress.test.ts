import { readFile } from "node:fs/promises";
import path from "node:path";

import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Exit, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PublicationJournal } from "#publishing/application/publication-journal.ts";
import { PublicationProgress } from "#publishing/application/publication-progress.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { DrizzlePublicationJournal } from "#publishing/infrastructure/drizzle-publication-journal.ts";
import { DrizzlePublicationProgress } from "#publishing/infrastructure/drizzle-publication-progress.ts";
import { TikTokProgressSchema } from "#publishing/infrastructure/platforms/tiktok/tiktok-client.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { PostId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// A call of several requests records how far it got on its journal row, so
// a resumed run carries on from there. What it records is persisted
// contract, as the adapters' own schemas say.

const StorageTest = Layer.mergeAll(
  DrizzlePublicationJournal,
  DrizzlePublicationProgress
).pipe(Layer.provideMerge(DatabaseTest));

const deletePost = (postId: PostId) =>
  SqlClient.SqlClient.use(
    (sql) => sql`DELETE FROM publishing.posts WHERE id = ${postId}`
  ).pipe(Effect.orDie);

// A call the journal began for a target of a synthetic post.
const begunCall = Effect.fn("begunCall")(function* begunCall() {
  const sql = yield* SqlClient.SqlClient;
  const journal = yield* PublicationJournal;
  const workspaceId = yield* freshWorkspace;
  const postId = yield* newId(PostIdSchema);
  const targetId = yield* newId(PostTargetIdSchema);
  const channelId = yield* newId(ChannelIdSchema);
  const idempotencyKey = `${targetId}:1:publish/1`;

  yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text) VALUES (${postId}, ${workspaceId}, 'publishing', 'A synthetic post')`;
  yield* sql`INSERT INTO publishing.post_targets (id, post_id, channel_id, status) VALUES (${targetId}, ${postId}, ${channelId}, 'publishing')`;

  yield* journal.begin({
    attempt: 1,
    idempotencyKey,
    part: 0,
    round: 1,
    startedAt: DateTime.makeUnsafe("2026-11-09T10:00:00Z"),
    targetId,
  });

  return { idempotencyKey, postId };
});

layer(StorageTest)("a call's recorded progress", (it) => {
  it.effect("is nothing until the adapter records some, then its last", () =>
    Effect.gen(function* records() {
      const progress = yield* PublicationProgress;
      const { idempotencyKey, postId } = yield* begunCall();

      yield* Effect.gen(function* checks() {
        assert.deepStrictEqual(yield* progress.read(idempotencyKey), {
          _tag: "begun",
          recorded: Option.none(),
        });

        yield* progress.record(idempotencyKey, {
          _tag: "uploading",
          publishId: "v_inbox_file~v2.synthetic",
        });
        yield* progress.record(idempotencyKey, {
          _tag: "finishing",
          publishId: "v_inbox_file~v2.synthetic",
        });

        assert.deepStrictEqual(yield* progress.read(idempotencyKey), {
          _tag: "begun",
          recorded: Option.some({
            _tag: "finishing",
            publishId: "v_inbox_file~v2.synthetic",
          }),
        });
      }).pipe(Effect.ensuring(deletePost(postId)));
    })
  );

  it.effect("says so of a key the journal never began", () =>
    Effect.gen(function* unknown() {
      const progress = yield* PublicationProgress;

      assert.deepStrictEqual(
        yield* progress.read(
          "00000000-0000-7000-8000-0000000000ff:1:publish/1"
        ),
        { _tag: "unknownCall" }
      );

      const recorded = yield* progress
        .record("00000000-0000-7000-8000-0000000000ff:1:publish/1", {})
        .pipe(Effect.exit);

      assert.isTrue(Exit.isFailure(recorded));
    })
  );

  it.effect("keeps TikTok's steps decoding as this release writes them", () =>
    Effect.gen(function* tiktokSteps() {
      const stored = yield* Effect.promise(
        async () =>
          await readFile(
            path.join(
              import.meta.dirname,
              "fixtures",
              "persisted",
              "publication-calls",
              "tiktok-progress.json"
            ),
            "utf-8"
          )
      );

      const steps = yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(
          Schema.Array(Schema.toCodecJson(TikTokProgressSchema))
        )
      )(stored);

      assert.deepStrictEqual(
        steps.map(({ _tag }) => _tag),
        ["pulling", "pulling", "pulled", "uploading", "finishing"]
      );
    })
  );
});
