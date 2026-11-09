import { assert, layer } from "@effect/vitest";
import { Duration, Effect, Layer, Option } from "effect";

import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { MultipartUploadIdSchema } from "#media/domain/media-status.ts";
import { storageKeyFor } from "#media/domain/storage-key.ts";
import { plannedParts } from "#media/domain/upload-plan.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import {
  fetchBytes,
  mebibytes,
  sendSigned,
  storageSettings,
  syntheticBytes,
} from "#test/media/support.ts";

const expiresIn = Duration.minutes(5);

const StorageTest = Layer.mergeAll(S3MediaStorageLive, IdsLive).pipe(
  Layer.provide(storageSettings)
);

// A fresh key per test, so runs never meet.
const freshKey = Effect.gen(function* freshKey() {
  const ids = yield* Ids;
  const workspaceId = WorkspaceIdSchema.make(yield* ids.next);
  const assetId = MediaAssetIdSchema.make(yield* ids.next);

  return storageKeyFor(workspaceId, assetId, "image/png");
});

layer(StorageTest)("the S3 media store", (it) => {
  it.effect("takes a presigned PUT sent with plain fetch", () =>
    Effect.gen(function* presignedPut() {
      const storage = yield* MediaStorage;
      const key = yield* freshKey;
      const body = syntheticBytes(1500);

      const signed = yield* storage.signUpload({
        byteSize: body.length,
        contentType: "image/png",
        expiresIn,
        key,
      });

      assert.strictEqual(signed.method, "PUT");
      assert.deepStrictEqual(signed.headers, {
        "content-type": "image/png",
        "if-none-match": "*",
      });

      const response = yield* sendSigned(signed, body);

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(
        yield* storage.head(key),
        Option.some({ byteSize: 1500, contentType: Option.some("image/png") })
      );

      yield* storage.remove(key);
    })
  );

  it.effect("refuses a body of another size or content type", () =>
    Effect.gen(function* refusesOtherBodies() {
      const storage = yield* MediaStorage;
      const key = yield* freshKey;

      const signed = yield* storage.signUpload({
        byteSize: 100,
        contentType: "image/png",
        expiresIn,
        key,
      });

      const longer = yield* sendSigned(signed, syntheticBytes(101));

      const retyped = yield* sendSigned(
        {
          headers: { ...signed.headers, "content-type": "image/jpeg" },
          url: signed.url,
        },
        syntheticBytes(100)
      );

      // Without If-None-Match, the PUT could replace a stored file.
      const unconditional = yield* sendSigned(
        { headers: { "content-type": "image/png" }, url: signed.url },
        syntheticBytes(100)
      );

      assert.strictEqual(longer.status, 403);
      assert.strictEqual(retyped.status, 403);
      assert.strictEqual(unconditional.status, 403);
      assert.deepStrictEqual(yield* storage.head(key), Option.none());
    })
  );

  it.effect("never replaces a stored file with the same URL", () =>
    Effect.gen(function* createOnly() {
      const storage = yield* MediaStorage;
      const key = yield* freshKey;
      const first = syntheticBytes(200);
      const second = first.map((byte) => 255 - byte);

      const signed = yield* storage.signUpload({
        byteSize: first.length,
        contentType: "image/png",
        expiresIn,
        key,
      });

      yield* Effect.addFinalizer(() => Effect.orDie(storage.remove(key)));

      assert.strictEqual((yield* sendSigned(signed, first)).status, 200);
      assert.strictEqual((yield* sendSigned(signed, second)).status, 412);

      const { bytes } = yield* fetchBytes(
        yield* storage.publicUrl(key, expiresIn)
      );

      assert.deepStrictEqual(bytes, first);
    })
  );

  it.effect("joins a multipart upload sent part by part", () =>
    Effect.gen(function* multipart() {
      const storage = yield* MediaStorage;
      const key = yield* freshKey;
      const body = syntheticBytes(mebibytes(11) + 321);
      const partSize = mebibytes(5);
      const uploadId = yield* storage.startMultipartUpload(key, "video/mp4");
      const upload = { key, uploadId };
      const parts = plannedParts(body.length, partSize);

      assert.lengthOf(parts, 3);

      for (const part of parts) {
        const signed = yield* storage.signUploadPart({
          expiresIn,
          part,
          upload,
        });

        const start = (part.partNumber - 1) * partSize;

        const response = yield* sendSigned(
          signed,
          body.slice(start, start + part.byteSize)
        );

        assert.strictEqual(response.status, 200);
      }

      const stored = yield* storage.listUploadedParts(upload);

      assert.deepStrictEqual(
        stored.map(({ byteSize, partNumber }) => ({ byteSize, partNumber })),
        parts
      );

      yield* storage.completeMultipartUpload(upload, stored);

      assert.deepStrictEqual(
        yield* storage.head(key),
        Option.some({
          byteSize: body.length,
          contentType: Option.some("video/mp4"),
        })
      );

      const { bytes } = yield* fetchBytes(
        yield* storage.publicUrl(key, expiresIn)
      );

      assert.deepStrictEqual(bytes, body);

      // The upload is gone once joined.
      const relisted = yield* Effect.flip(storage.listUploadedParts(upload));

      assert.strictEqual(relisted._tag, "MultipartUploadNotFound");

      yield* storage.remove(key);
    })
  );

  it.effect("aborts a multipart upload, and an unknown one", () =>
    Effect.gen(function* aborts() {
      const storage = yield* MediaStorage;
      const key = yield* freshKey;
      const uploadId = yield* storage.startMultipartUpload(key, "video/mp4");

      yield* storage.abortMultipartUpload({ key, uploadId });
      yield* storage.abortMultipartUpload({ key, uploadId });

      const listed = yield* Effect.flip(
        storage.listUploadedParts({ key, uploadId })
      );

      assert.strictEqual(listed._tag, "MultipartUploadNotFound");

      const completed = yield* Effect.flip(
        storage.completeMultipartUpload(
          { key, uploadId: MultipartUploadIdSchema.make("no-such-upload") },
          [{ byteSize: 1, etag: '"0"', partNumber: 1 }]
        )
      );

      assert.strictEqual(completed._tag, "MultipartUploadNotFound");
    })
  );

  it.effect("serves a stored file at its public URL", () =>
    Effect.gen(function* publicUrl() {
      const storage = yield* MediaStorage;
      const key = yield* freshKey;
      const body = syntheticBytes(4096);

      yield* sendSigned(
        yield* storage.signUpload({
          byteSize: body.length,
          contentType: "image/png",
          expiresIn,
          key,
        }),
        body
      );

      const { bytes, response } = yield* fetchBytes(
        yield* storage.publicUrl(key, expiresIn)
      );

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.headers.get("content-type"), "image/png");
      assert.deepStrictEqual(bytes, body);

      yield* storage.remove(key);
    })
  );

  it.effect("deletes a file, and one already gone", () =>
    Effect.gen(function* deletes() {
      const storage = yield* MediaStorage;
      const key = yield* freshKey;
      const body = syntheticBytes(10);

      yield* sendSigned(
        yield* storage.signUpload({
          byteSize: body.length,
          contentType: "image/png",
          expiresIn,
          key,
        }),
        body
      );

      const url = yield* storage.publicUrl(key, expiresIn);

      yield* storage.remove(key);
      yield* storage.remove(key);

      assert.deepStrictEqual(yield* storage.head(key), Option.none());
      assert.strictEqual((yield* fetchBytes(url)).response.status, 404);
    })
  );

  it.effect("reports a file that is not there", () =>
    Effect.gen(function* missing() {
      const storage = yield* MediaStorage;

      assert.deepStrictEqual(
        yield* storage.head(yield* freshKey),
        Option.none()
      );
    })
  );
});
