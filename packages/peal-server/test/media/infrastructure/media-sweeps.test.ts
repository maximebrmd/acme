// The sweeps of the media store, on the development stack's SeaweedFS and
// Postgres. Every object goes under a prefix of this run's own
// (`<PEAL_S3_KEY_PREFIX or tests/media/>sweeps/<random>/`), which the
// sweeps are given as the store's prefix, so they never reach another
// suite's files, and the run deletes its prefix when it ends. Rows are
// dated before 1970, which no other suite writes (their clocks start at
// the epoch or run on the real one), and the sweeps of the database are
// run at a time that reaches those alone.
import { randomUUID } from "node:crypto";

import {
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
  ListMultipartUploadsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { MediaRecords } from "#media/application/media-records.ts";
import { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MediaSweeps } from "#media/application/media-sweeps.ts";
import { MediaBucket } from "#media/application/ports/media-bucket.ts";
import { MediaFolders } from "#media/application/ports/media-folders.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import {
  CurrentSweepPolicy,
  defaultSweepPolicy,
} from "#media/application/sweep-policy.ts";
import type { SweepPolicy } from "#media/application/sweep-policy.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import type { MultipartUploadId } from "#media/domain/media-status.ts";
import { storageKeyFor } from "#media/domain/storage-key.ts";
import type { StorageKey } from "#media/domain/storage-key.ts";
import { PartNumberSchema } from "#media/domain/upload-plan.ts";
import { DrizzleMediaRecords } from "#media/infrastructure/drizzle-media-records.ts";
import { DrizzleMediaSweepStore } from "#media/infrastructure/drizzle-media-sweep-store.ts";
import {
  makeS3MediaBucket,
  makeS3MediaFolders,
  makeS3MediaStorage,
  S3StorageConfig,
} from "#media/infrastructure/s3-media-storage.ts";
import { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { acquireS3Client } from "#shared/infrastructure/s3-store.ts";
import {
  DatabaseTest,
  sendSigned,
  storageSettings,
  syntheticBytes,
  TransactionsTest,
} from "#test/media/support.ts";

const run = randomUUID();

// The store as the sweeps see it, under this run's prefix, and a sibling
// prefix, as another instance sharing the bucket would have.
const settingsOf = (folder: string) =>
  S3StorageConfig.pipe(
    Effect.map((base) => ({
      ...base,
      keyPrefix: `${base.keyPrefix}sweeps/${folder}/`,
    })),
    Effect.orDie
  );

const own = settingsOf(run);
const sibling = settingsOf(`${run}-sibling`);

// The raw store, for objects Peal never writes and the run's cleanup.
const Raw = Effect.gen(function* raw() {
  const settings = yield* own;

  return {
    client: yield* acquireS3Client(settings),
    settings,
  };
});

const put = (objectKey: string, body: Uint8Array<ArrayBuffer>) =>
  Effect.gen(function* putting() {
    const { client, settings } = yield* Raw;

    yield* Effect.promise(
      async () =>
        await client.send(
          new PutObjectCommand({
            Body: body,
            Bucket: settings.bucket,
            Key: objectKey,
          })
        )
    );
  });

// The keys under a prefix, as the store lists them.
const keysUnder = (prefix: string) =>
  Effect.gen(function* listing() {
    const { client, settings } = yield* Raw;

    const page = yield* Effect.promise(
      async () =>
        await client.send(
          new ListObjectsV2Command({ Bucket: settings.bucket, Prefix: prefix })
        )
    );

    return (page.Contents ?? []).flatMap(({ Key: key }) =>
      key === undefined ? [] : [key]
    );
  });

// Deletes what this run wrote: its two prefixes, nothing else.
const cleanUp = Effect.gen(function* cleanUp() {
  const { client, settings } = yield* Raw;
  const { keyPrefix: ownPrefix } = settings;
  const { keyPrefix: siblingPrefix } = yield* sibling;

  // Only the run's own prefixes, whatever the settings say.
  const prefixes = [ownPrefix, siblingPrefix].filter(
    (prefix) =>
      prefix.endsWith(`sweeps/${run}/`) ||
      prefix.endsWith(`sweeps/${run}-sibling/`)
  );

  for (const prefix of prefixes) {
    const open = yield* Effect.promise(
      async () =>
        await client.send(
          new ListMultipartUploadsCommand({
            Bucket: settings.bucket,
            Prefix: prefix,
          })
        )
    );

    for (const { Key: key, UploadId: uploadId } of open.Uploads ?? []) {
      yield* Effect.promise(
        async () =>
          await client.send(
            new AbortMultipartUploadCommand({
              Bucket: settings.bucket,
              Key: key,
              UploadId: uploadId,
            })
          )
      );
    }

    for (const key of yield* keysUnder(prefix)) {
      yield* Effect.promise(
        async () =>
          await client.send(
            new DeleteObjectCommand({ Bucket: settings.bucket, Key: key })
          )
      );
    }
  }

  const sql = yield* SqlClient.SqlClient;

  yield* sql`DELETE FROM media.sweep_cursors`.pipe(Effect.orDie);
}).pipe(Effect.scoped);

const StoreTest = Layer.unwrap(
  Effect.gen(function* store() {
    const settings = yield* own;

    return Layer.mergeAll(
      Layer.effect(MediaStorage, makeS3MediaStorage(settings)),
      Layer.effect(MediaBucket, makeS3MediaBucket(settings)),
      Layer.effect(MediaFolders, makeS3MediaFolders(settings))
    );
  })
).pipe(Layer.orDie);

// The sweeps under `policy`, on this run's store, and what the tests read
// and write beside them. Cursors left by an earlier run are forgotten
// first, and everything the run wrote when the block ends.
const sweepsWith = (policy: Partial<SweepPolicy>) =>
  Layer.mergeAll(
    MediaSweeps.layer.pipe(
      Layer.provide(
        Layer.succeed(CurrentSweepPolicy, { ...defaultSweepPolicy, ...policy })
      )
    ),
    DrizzleMediaRecords,
    Layer.effectDiscard(Effect.acquireRelease(cleanUp, () => cleanUp))
  ).pipe(
    Layer.provideMerge(Layer.mergeAll(StoreTest, DrizzleMediaSweepStore)),
    Layer.provideMerge(TransactionsTest),
    Layer.provideMerge(DatabaseTest),
    Layer.provide(storageSettings)
  );

// Before 1970: rows no other suite writes.
const longAgo = DateTime.makeUnsafe("1964-06-01T00:00:00Z");

const at = (instant: DateTime.Utc) =>
  TestClock.setTime(DateTime.toEpochMillis(instant));

const freshKey = Effect.gen(function* freshKey() {
  const ids = yield* Ids;
  const workspaceId = WorkspaceIdSchema.make(yield* ids.next);
  const assetId = MediaAssetIdSchema.make(yield* ids.next);

  return {
    assetId,
    key: storageKeyFor(workspaceId, assetId, "image/png"),
    workspaceId,
  };
});

interface Row {
  readonly assetId: string;
  readonly createdAt: DateTime.Utc;
  readonly key: StorageKey;
  readonly multipartUploadId?: MultipartUploadId;
  readonly status: "pending" | "ready" | "rejected" | "uploaded";
  readonly workspaceId: WorkspaceId;
}

const insertRow = (row: Row) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`INSERT INTO media.media_assets (id, workspace_id, storage_key, content_type, byte_size, status, created_at, updated_at, multipart_upload_id, multipart_part_size, probe_state, rejection_reason)
        VALUES (${row.assetId}, ${row.workspaceId}, ${row.key}, 'image/png', 1500, ${row.status}, ${DateTime.toDate(row.createdAt)}, ${DateTime.toDate(row.createdAt)},
          ${row.multipartUploadId ?? null}, ${row.multipartUploadId === undefined ? null : 8 * 1024 * 1024},
          ${row.status === "uploaded" ? "pending" : null}, ${row.status === "rejected" ? "sizeMismatch" : null})`
  ).pipe(Effect.orDie);

const rowsOf = (keys: readonly string[]) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly storage_key: string;
      }>`SELECT storage_key FROM media.media_assets WHERE storage_key IN ${sql.in(keys)} ORDER BY storage_key`
  ).pipe(
    Effect.orDie,
    Effect.map((rows) => rows.map(({ storage_key: key }) => key))
  );

const deleteRows = (keys: readonly string[]) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`DELETE FROM media.media_assets WHERE storage_key IN ${sql.in(keys)}`
  ).pipe(Effect.orDie);

// A file stored with a presigned PUT, as a browser sends it.
const upload = (key: StorageKey, size: number) =>
  Effect.gen(function* uploading() {
    const storage = yield* MediaStorage;

    const signed = yield* storage.signUpload({
      byteSize: size,
      contentType: "image/png",
      expiresIn: Duration.minutes(5),
      key,
    });

    const sent = yield* sendSigned(signed, syntheticBytes(size));

    assert.strictEqual(sent.status, 200);
  });

const stored = (key: StorageKey) =>
  MediaStorage.use((storage) => storage.head(key)).pipe(
    Effect.map(Option.isSome)
  );

// A multipart upload with one part sent, left open.
const openUpload = (key: StorageKey) =>
  Effect.gen(function* opening() {
    const storage = yield* MediaStorage;
    const uploadId = yield* storage.startMultipartUpload(key, "video/mp4");

    const signed = yield* storage.signUploadPart({
      expiresIn: Duration.minutes(5),
      part: { byteSize: 1024, partNumber: PartNumberSchema.make(1) },
      upload: { key, uploadId },
    });

    const sent = yield* sendSigned(signed, syntheticBytes(1024));

    assert.strictEqual(sent.status, 200);

    return uploadId;
  });

const isOpen = (key: StorageKey, uploadId: MultipartUploadId) =>
  MediaStorage.use((storage) =>
    storage.listUploadedParts({ key, uploadId })
  ).pipe(
    Effect.as(true),
    Effect.catchTag("MultipartUploadNotFound", () => Effect.succeed(false))
  );

// Two days after now on the real clock, which dates what the store holds.
// The store dates what it holds by the real clock: the sweeps that read
// those dates run on it, under a bound of a day (nothing is that old) or
// of nothing (everything listed is older than now, a second after it was
// written).
const realClock = {
  excludeTestServices: true,
  timeout: "120 seconds",
} as const;

const aSecond = Effect.sleep(Duration.seconds(1.1));

layer(sweepsWith({}), { timeout: "120 seconds" })(
  "the sweeps of the media store",
  (it) => {
    it.effect(
      "delete uploads never completed past their bound, the asset first, and nothing younger or completed",
      () =>
        Effect.gen(function* pendingSweep() {
          const single = yield* freshKey;
          const parts = yield* freshKey;
          const young = yield* freshKey;
          const done = yield* freshKey;

          yield* upload(single.key, 1500);
          yield* upload(done.key, 1500);

          const uploadId = yield* openUpload(parts.key);

          yield* insertRow({
            ...single,
            createdAt: longAgo,
            status: "pending",
          });
          yield* insertRow({
            ...parts,
            createdAt: longAgo,
            multipartUploadId: uploadId,
            status: "pending",
          });
          yield* insertRow({
            ...young,
            createdAt: DateTime.addDuration(longAgo, Duration.hours(13)),
            status: "pending",
          });
          yield* insertRow({ ...done, createdAt: longAgo, status: "uploaded" });

          // A day and twelve hours later: the first two passed their day.
          yield* at(DateTime.addDuration(longAgo, Duration.hours(36)));

          const report = yield* MediaSweeps.use((sweeps) => sweeps.pending);

          assert.deepStrictEqual(report, {
            bytes: 1500,
            left: false,
            swept: 2,
          });
          assert.deepStrictEqual(
            yield* rowsOf([single.key, parts.key, young.key, done.key]),
            [young.key, done.key].toSorted()
          );
          assert.isFalse(yield* stored(single.key));
          assert.isFalse(yield* isOpen(parts.key, uploadId));
          assert.isTrue(yield* stored(done.key));

          // Run again, it finds nothing more.
          assert.deepStrictEqual(
            yield* MediaSweeps.use((sweeps) => sweeps.pending),
            { bytes: 0, left: false, swept: 0 }
          );

          yield* deleteRows([young.key, done.key]);
        })
    );
    it.effect(
      "empty an erased workspace's folder the erasure could not, once it committed, then forget it",
      () =>
        Effect.gen(function* folderSweep() {
          const first = yield* freshKey;
          const { workspaceId } = first;
          const ids = yield* Ids;

          const second = storageKeyFor(
            workspaceId,
            MediaAssetIdSchema.make(yield* ids.next),
            "image/png"
          );

          const third = storageKeyFor(
            workspaceId,
            MediaAssetIdSchema.make(yield* ids.next),
            "image/png"
          );

          yield* upload(first.key, 1000);
          yield* upload(second, 2000);

          const uploadId = yield* openUpload(third);

          yield* insertRow({ ...first, createdAt: longAgo, status: "ready" });
          yield* at(longAgo);

          // The erasure commits, then the store fails.
          const failing = Layer.succeed(
            MediaFolders,
            MediaFolders.of({
              removeWorkspace: () =>
                Effect.fail(
                  new MediaStorageFailed({
                    cause: "synthetic outage",
                    operation: "delete a file",
                  })
                ),
            })
          );

          yield* Effect.gen(function* erasing() {
            const records = yield* MediaRecords;
            const { transaction } = yield* TransactionRunner;

            yield* transaction(records.eraseWorkspace(workspaceId));

            const removal = yield* records
              .removeWorkspaceFiles(workspaceId)
              .pipe(Effect.flip);

            assert.strictEqual(removal._tag, "MediaStorageFailed");
          }).pipe(
            Effect.provide(
              DrizzleMediaRecords.pipe(Layer.provide(failing), Layer.fresh)
            )
          );

          assert.isTrue(yield* stored(first.key));

          // Within the grace an erasure has to empty it itself: left.
          yield* at(DateTime.addDuration(longAgo, Duration.minutes(5)));

          assert.strictEqual(
            (yield* MediaSweeps.use((sweeps) => sweeps.folders)).swept,
            0
          );

          yield* at(DateTime.addDuration(longAgo, Duration.hours(1)));

          const report = yield* MediaSweeps.use((sweeps) => sweeps.folders);

          assert.deepStrictEqual(report, {
            bytes: 3000,
            left: false,
            swept: 3,
          });
          assert.isFalse(yield* stored(first.key));
          assert.isFalse(yield* stored(second));
          assert.isFalse(yield* isOpen(third, uploadId));
          assert.deepStrictEqual(
            yield* MediaSweeps.use((sweeps) => sweeps.folders),
            { bytes: 0, left: false, swept: 0 }
          );
        })
    );

    it.effect(
      "take a folder the erasure emptied itself off the sweep's list",
      () =>
        Effect.gen(function* emptiedFolder() {
          const { key, workspaceId } = yield* freshKey;
          const records = yield* MediaRecords;
          const { transaction } = yield* TransactionRunner;

          yield* upload(key, 1000);
          yield* at(longAgo);
          yield* transaction(records.eraseWorkspace(workspaceId));
          yield* records.removeWorkspaceFiles(workspaceId);

          assert.isFalse(yield* stored(key));

          yield* at(DateTime.addDuration(longAgo, Duration.hours(1)));

          assert.deepStrictEqual(
            yield* MediaSweeps.use((sweeps) => sweeps.folders),
            { bytes: 0, left: false, swept: 0 }
          );
        })
    );
  }
);

layer(
  sweepsWith({
    orphansAfter: Duration.days(1),
    uploadsAfter: Duration.days(1),
  }),
  realClock
)("the sweeps of the media store, before their bound", (it) => {
  it.effect("leave the uploads and files younger than it", () =>
    Effect.gen(function* young() {
      const file = yield* freshKey;
      const open = yield* freshKey;

      yield* upload(file.key, 100);

      const uploadId = yield* openUpload(open.key);

      assert.strictEqual(
        (yield* MediaSweeps.use((sweeps) => sweeps.orphans)).swept,
        0
      );
      assert.strictEqual(
        (yield* MediaSweeps.use((sweeps) => sweeps.uploads)).swept,
        0
      );
      assert.isTrue(yield* stored(file.key));
      assert.isTrue(yield* isOpen(open.key, uploadId));
    })
  );
});

const past = { orphansAfter: Duration.zero, uploadsAfter: Duration.zero };

layer(sweepsWith(past), realClock)(
  "the sweeps of the media store, past their bound",
  (it) => {
    it.effect("abort multipart uploads left open past their bound", () =>
      Effect.gen(function* uploadsSweep() {
        const first = yield* freshKey;
        const second = yield* freshKey;
        const firstId = yield* openUpload(first.key);
        const secondId = yield* openUpload(second.key);

        yield* aSecond;

        const report = yield* MediaSweeps.use((sweeps) => sweeps.uploads);

        assert.deepStrictEqual(report, { bytes: 0, left: false, swept: 2 });
        assert.isFalse(yield* isOpen(first.key, firstId));
        assert.isFalse(yield* isOpen(second.key, secondId));
      })
    );

    it.effect(
      "delete files no asset holds past their bound, a rejected asset's too, and nothing else of the bucket",
      () =>
        Effect.gen(function* orphansSweep() {
          const { settings } = yield* Raw.pipe(Effect.scoped);
          const prefix = settings.keyPrefix;
          const { keyPrefix: siblingPrefix } = yield* sibling;
          const orphan = yield* freshKey;
          const held = yield* freshKey;
          const rejected = yield* freshKey;
          const elsewhere = yield* freshKey;

          // A single upload's URL used after its asset was deleted.
          yield* upload(orphan.key, 1200);
          yield* upload(held.key, 1500);
          yield* upload(rejected.key, 1300);
          yield* insertRow({ ...held, createdAt: longAgo, status: "ready" });
          yield* insertRow({
            ...rejected,
            createdAt: longAgo,
            status: "rejected",
          });

          const others = [
            `${prefix}erasures/${orphan.assetId}.json`,
            `${prefix}media/notes.txt`,
            `${prefix}media/media/${orphan.workspaceId}/${orphan.assetId}.png`,
            `${siblingPrefix}${elsewhere.key}`,
          ];

          for (const key of others) {
            yield* put(key, syntheticBytes(10)).pipe(Effect.scoped);
          }

          yield* aSecond;

          const report = yield* MediaSweeps.use((sweeps) => sweeps.orphans);

          assert.deepStrictEqual(report, {
            bytes: 2500,
            left: false,
            swept: 2,
          });
          assert.isFalse(yield* stored(orphan.key));
          assert.isFalse(yield* stored(rejected.key));
          assert.isTrue(yield* stored(held.key));

          const left = [
            ...(yield* keysUnder(prefix).pipe(Effect.scoped)),
            ...(yield* keysUnder(siblingPrefix).pipe(Effect.scoped)),
          ];

          assert.deepStrictEqual(
            left.toSorted(),
            [`${prefix}${held.key}`, ...others].toSorted()
          );

          yield* deleteRows([held.key, rejected.key]);
        })
    );
  }
);

// What a run of a sweep did, its bytes aside.
const sweepOnce = (
  pick: (sweeps: MediaSweeps["Service"]) => MediaSweeps["Service"]["orphans"]
) =>
  MediaSweeps.use(pick).pipe(
    Effect.map(({ left, swept }) => ({ left, swept }))
  );

layer(sweepsWith({ ...past, batch: 1 }), realClock)(
  "the sweeps of the media store, a file a run",
  (it) => {
    it.effect("leave the rest to the next runs, and say so", () =>
      Effect.gen(function* bounded() {
        const first = yield* freshKey;
        const second = yield* freshKey;
        const third = yield* freshKey;
        const fourth = yield* freshKey;

        yield* upload(first.key, 100);
        yield* upload(second.key, 100);
        yield* openUpload(third.key);
        yield* openUpload(fourth.key);
        yield* aSecond;

        assert.deepStrictEqual(yield* sweepOnce((sweeps) => sweeps.orphans), {
          left: true,
          swept: 1,
        });
        assert.deepStrictEqual(yield* sweepOnce((sweeps) => sweeps.orphans), {
          left: true,
          swept: 1,
        });
        assert.deepStrictEqual(yield* sweepOnce((sweeps) => sweeps.orphans), {
          left: false,
          swept: 0,
        });
        assert.deepStrictEqual(yield* sweepOnce((sweeps) => sweeps.uploads), {
          left: true,
          swept: 1,
        });
        assert.deepStrictEqual(yield* sweepOnce((sweeps) => sweeps.uploads), {
          left: true,
          swept: 1,
        });
        assert.deepStrictEqual(yield* sweepOnce((sweeps) => sweeps.uploads), {
          left: false,
          swept: 0,
        });
      })
    );
  }
);
