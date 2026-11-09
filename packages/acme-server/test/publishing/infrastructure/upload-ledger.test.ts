import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { PlatformQuota } from "#publishing/application/platform-quota.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { UploadSessions } from "#publishing/application/upload-sessions.ts";
import { emptyContent } from "#publishing/domain/post-content.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { createTarget } from "#publishing/domain/post-target.ts";
import { createDraft } from "#publishing/domain/post.ts";
import { DrizzlePlatformQuota } from "#publishing/infrastructure/drizzle-platform-quota.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { DrizzleUploadSessions } from "#publishing/infrastructure/drizzle-upload-sessions.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

const StorageTest = Layer.mergeAll(
  DrizzleUploadSessions,
  DrizzlePlatformQuota,
  DrizzlePostRepository
).pipe(Layer.provideMerge(DatabaseTest));

// A call of a fresh target, as the journal begins it.
const journaledCall = Effect.gen(function* journaledCall() {
  const workspaceId = yield* freshWorkspace;
  const postId = yield* newId(PostIdSchema);
  const draft = createDraft(postId, workspaceId, emptyContent, Option.none());

  const target = createTarget(
    yield* newId(PostTargetIdSchema),
    postId,
    yield* newId(ChannelIdSchema)
  );

  yield* PostRepository.use((posts) => posts.insert(draft, [target]));

  const key = randomUUID();

  yield* SqlClient.SqlClient.use(
    (
      sql
    ) => sql`INSERT INTO publishing.publication_calls (idempotency_key, target_id, round, attempt, operation, started_at)
      VALUES (${key}, ${target.id}, 1, 1, 'publish', now())`
  ).pipe(Effect.orDie);

  return { key, postId };
});

layer(StorageTest)("the journal of YouTube's uploads", (it) => {
  it.effect(
    "keeps a session until its video is made, then only the video",
    () =>
      Effect.gen(function* sessions() {
        const uploads = yield* UploadSessions;
        const { key, postId } = yield* journaledCall;
        const openedAt = yield* DateTime.now;
        const sessionUrl = "https://www.googleapis.example/upload?upload_id=1";

        yield* uploads.open(key, { byteSize: 2048, openedAt, sessionUrl });

        assert.deepStrictEqual(
          yield* uploads.find(key),
          Option.some({
            byteSize: 2048,
            finalPartSent: false,
            sessionUrl: Option.some(sessionUrl),
            videoId: Option.none(),
          })
        );

        // An expired session is replaced while its last part never left.
        yield* uploads.open(key, {
          byteSize: 2048,
          openedAt,
          sessionUrl: `${sessionUrl}2`,
        });
        yield* uploads.finalPartSent(key);
        yield* uploads.open(key, {
          byteSize: 2048,
          openedAt,
          sessionUrl: `${sessionUrl}3`,
        });

        const sent = yield* uploads.find(key);

        assert.deepStrictEqual(
          sent.pipe(Option.flatMap(({ sessionUrl: url }) => url)),
          Option.some(`${sessionUrl}2`)
        );

        yield* uploads.made(key, "synthVideo01");

        assert.deepStrictEqual(
          yield* uploads.find(key),
          Option.some({
            byteSize: 2048,
            finalPartSent: true,
            sessionUrl: Option.none(),
            videoId: Option.some("synthVideo01"),
          })
        );

        // It goes with its post.
        yield* SqlClient.SqlClient.use(
          (sql) => sql`DELETE FROM publishing.posts WHERE id = ${postId}`
        ).pipe(Effect.orDie);

        assert.deepStrictEqual(yield* uploads.find(key), Option.none());
      })
  );

  it.effect("spends a day's quota up to its allowance, and no further", () =>
    Effect.gen(function* quota() {
      const ledger = yield* PlatformQuota;
      const bucket = `test.${randomUUID()}`;
      const day = { day: 9, month: 11, year: 2026 };

      const spends = yield* Effect.all(
        Array.from({ length: 5 }, () =>
          ledger.spend({ allowance: 3, bucket, day, units: 1 })
        ),
        { concurrency: 5 }
      );

      assert.strictEqual(spends.filter(Boolean).length, 3);
      assert.isFalse(
        yield* ledger.spend({ allowance: 3, bucket, day, units: 4 })
      );
      assert.isTrue(
        yield* ledger.spend({
          allowance: 3,
          bucket,
          day: { ...day, day: 10 },
          units: 1,
        })
      );

      yield* ledger.exhaust({ allowance: 3, bucket, day: { ...day, day: 10 } });

      assert.isFalse(
        yield* ledger.spend({
          allowance: 3,
          bucket,
          day: { ...day, day: 10 },
          units: 1,
        })
      );
    })
  );
});
