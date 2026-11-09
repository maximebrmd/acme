import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option } from "effect";
import sharp from "sharp";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import {
  CurrentUploadPolicy,
  defaultUploadPolicy,
} from "#media/application/upload-policy.ts";
import type { PreparedUpload } from "#media/application/use-cases/create-upload.ts";
import { MediaLibrary, MediaLive } from "#media/container.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  fetchBytes,
  mebibytes,
  sendSigned,
  storageSettings,
  syntheticBytes,
} from "#test/media/support.ts";

// The container's layer, plus the ports themselves so tests can look behind
// the use cases.
const LibraryTest = Layer.mergeAll(
  MediaLive,
  S3MediaStorageLive,
  DrizzleMediaAssetsLive
).pipe(Layer.provideMerge(DatabaseTest), Layer.provide(storageSettings));

// Parts of the stores' 5 MiB minimum, so a multipart test moves 11 MiB.
const smallParts = {
  ...defaultUploadPolicy,
  multipartThreshold: mebibytes(5),
  partSize: mebibytes(5),
};

const freshWorkspace: Effect.Effect<WorkspaceId, never, Ids> = Ids.use(
  (ids) => ids.next
).pipe(Effect.map((uuid) => WorkspaceIdSchema.make(uuid)));

const prepare = Effect.fn("prepare")(function* prepare(
  workspaceId: WorkspaceId,
  contentType: string,
  byteSize: number
) {
  const library = yield* MediaLibrary;

  return yield* library.createUpload({ byteSize, contentType, workspaceId });
});

const singleRequest = (prepared: PreparedUpload) =>
  prepared.target._tag === "single"
    ? Effect.succeed(prepared.target.request)
    : Effect.die("expected a single upload");

const multipartParts = (prepared: PreparedUpload) =>
  prepared.target._tag === "multipart"
    ? Effect.succeed(prepared.target.parts)
    : Effect.die("expected a multipart upload");

const complete = (prepared: PreparedUpload) =>
  MediaLibrary.use((library) =>
    library.completeUpload({
      assetId: prepared.asset.id,
      workspaceId: prepared.asset.workspaceId,
    })
  );

const recorded = (prepared: PreparedUpload) =>
  MediaAssets.use((assets) =>
    assets.findById(prepared.asset.workspaceId, prepared.asset.id)
  );

const storedObject = (prepared: PreparedUpload) =>
  MediaStorage.use((storage) => storage.head(prepared.asset.storageKey));

layer(LibraryTest)("the media library", (it) => {
  it.effect("uploads an image with one presigned PUT", () =>
    Effect.gen(function* singleUpload() {
      const workspaceId = yield* freshWorkspace;
      const body = syntheticBytes(5000);
      const prepared = yield* prepare(workspaceId, "image/webp", body.length);

      assert.deepStrictEqual(prepared.asset.status, {
        _tag: "pending",
        upload: { _tag: "single" },
      });
      assert.deepStrictEqual(
        yield* recorded(prepared),
        Option.some(prepared.asset)
      );

      const request = yield* singleRequest(prepared);

      assert.isTrue(
        DateTime.isGreaterThan(
          prepared.target.expiresAt,
          prepared.asset.createdAt
        )
      );
      assert.strictEqual((yield* sendSigned(request, body)).status, 200);

      const uploaded = yield* complete(prepared);

      assert.deepStrictEqual(uploaded.status, { _tag: "uploaded" });
      assert.deepStrictEqual(yield* recorded(prepared), Option.some(uploaded));

      // Completing again changes nothing.
      assert.deepStrictEqual(yield* complete(prepared), uploaded);

      // The URL cannot swap the checked file for other bytes of its size.
      const swapped = yield* sendSigned(
        request,
        body.map((byte) => 255 - byte)
      );

      assert.strictEqual(swapped.status, 412);

      const { bytes } = yield* fetchBytes(
        yield* MediaStorage.use((storage) =>
          storage.publicUrl(prepared.asset.storageKey, Duration.minutes(5))
        )
      );

      assert.deepStrictEqual(bytes, body);
    })
  );

  it.effect("refuses a type it does not store", () =>
    Effect.gen(function* unsupported() {
      const workspaceId = yield* freshWorkspace;

      const error = yield* Effect.flip(
        prepare(workspaceId, "image/svg+xml", 10)
      );

      assert.strictEqual(error._tag, "UnsupportedMediaType");
    })
  );

  it.effect("refuses an image over 16 MiB", () =>
    Effect.gen(function* tooLarge() {
      const workspaceId = yield* freshWorkspace;

      const error = yield* Effect.flip(
        prepare(workspaceId, "image/png", mebibytes(16) + 1)
      );

      assert.strictEqual(error._tag, "MediaTooLarge");
    })
  );

  it.effect("uploads a large video in parts", () =>
    Effect.gen(function* multipartUpload() {
      const workspaceId = yield* freshWorkspace;
      const body = syntheticBytes(mebibytes(11) + 777);

      const prepared = yield* prepare(
        workspaceId,
        "video/mp4",
        body.length
      ).pipe(Effect.provideService(CurrentUploadPolicy, smallParts));

      const parts = yield* multipartParts(prepared);

      assert.deepStrictEqual(
        parts.map(({ byteSize, partNumber }) => ({ byteSize, partNumber })),
        [
          { byteSize: mebibytes(5), partNumber: 1 },
          { byteSize: mebibytes(5), partNumber: 2 },
          { byteSize: mebibytes(1) + 777, partNumber: 3 },
        ]
      );

      const send = (index: number) => {
        const part = parts[index];

        return part === undefined
          ? Effect.die("no such part")
          : sendSigned(
              part.request,
              body.slice(
                (part.partNumber - 1) * mebibytes(5),
                (part.partNumber - 1) * mebibytes(5) + part.byteSize
              )
            );
      };

      // Two parts of three: the upload stays pending.
      yield* send(0);
      yield* send(2);

      const early = yield* Effect.flip(complete(prepared));

      assert.strictEqual(early._tag, "UploadIncomplete");
      assert.strictEqual(
        Option.getOrUndefined(yield* recorded(prepared))?.status._tag,
        "pending"
      );

      yield* send(1);

      const uploaded = yield* complete(prepared);

      assert.deepStrictEqual(uploaded.status, { _tag: "uploaded" });
      assert.deepStrictEqual(
        yield* storedObject(prepared),
        Option.some({
          byteSize: body.length,
          contentType: Option.some("video/mp4"),
        })
      );

      const { bytes } = yield* fetchBytes(
        yield* MediaStorage.use((storage) =>
          storage.publicUrl(prepared.asset.storageKey, Duration.minutes(5))
        )
      );

      assert.deepStrictEqual(bytes, body);
      assert.deepStrictEqual(yield* complete(prepared), uploaded);
    })
  );

  it.effect("leaves an upload pending until the file arrives", () =>
    Effect.gen(function* notYet() {
      const workspaceId = yield* freshWorkspace;
      const prepared = yield* prepare(workspaceId, "image/png", 100);
      const error = yield* Effect.flip(complete(prepared));

      assert.strictEqual(error._tag, "UploadIncomplete");
      assert.deepStrictEqual(
        yield* recorded(prepared),
        Option.some(prepared.asset)
      );
    })
  );

  it.effect.each([
    { byteSize: 999, contentType: "image/png", reason: "sizeMismatch" },
    { byteSize: 1000, contentType: "image/jpeg", reason: "typeMismatch" },
  ] as const)(
    "rejects a stored file of $byteSize bytes and type $contentType",
    ({ byteSize, contentType, reason }) =>
      Effect.gen(function* mismatch() {
        const workspaceId = yield* freshWorkspace;
        const prepared = yield* prepare(workspaceId, "image/png", 1000);
        const storage = yield* MediaStorage;

        // Another file at the same key: what a client that ignores the
        // declaration, or a store that ignores signed headers, leaves.
        const other = yield* storage.signUpload({
          byteSize,
          contentType,
          expiresIn: Duration.minutes(5),
          key: prepared.asset.storageKey,
        });

        assert.strictEqual(
          (yield* sendSigned(other, syntheticBytes(byteSize))).status,
          200
        );

        const error = yield* Effect.flip(complete(prepared));

        assert.include(error, { _tag: "UploadRejected", reason });
        assert.deepStrictEqual(
          Option.getOrUndefined(yield* recorded(prepared))?.status,
          { _tag: "rejected", reason }
        );
        assert.deepStrictEqual(yield* storedObject(prepared), Option.none());

        const again = yield* Effect.flip(complete(prepared));

        assert.strictEqual(again._tag, "InvalidMediaTransition");
      })
  );

  it.effect("deletes an uploaded file and its asset", () =>
    Effect.gen(function* deletes() {
      const workspaceId = yield* freshWorkspace;
      const body = syntheticBytes(300);
      const prepared = yield* prepare(workspaceId, "image/gif", body.length);
      const library = yield* MediaLibrary;

      yield* sendSigned(yield* singleRequest(prepared), body);
      yield* complete(prepared);

      const url = yield* MediaStorage.use((storage) =>
        storage.publicUrl(prepared.asset.storageKey, Duration.minutes(5))
      );

      yield* library.deleteMedia({ assetId: prepared.asset.id, workspaceId });

      assert.deepStrictEqual(yield* recorded(prepared), Option.none());
      assert.deepStrictEqual(yield* storedObject(prepared), Option.none());
      assert.strictEqual((yield* fetchBytes(url)).response.status, 404);

      const again = yield* Effect.flip(
        library.deleteMedia({ assetId: prepared.asset.id, workspaceId })
      );

      assert.strictEqual(again._tag, "MediaAssetNotFound");
    })
  );

  it.effect("aborts the upload of a pending video it deletes", () =>
    Effect.gen(function* deletesPending() {
      const workspaceId = yield* freshWorkspace;

      const prepared = yield* prepare(
        workspaceId,
        "video/quicktime",
        mebibytes(6)
      ).pipe(Effect.provideService(CurrentUploadPolicy, smallParts));

      const { status } = prepared.asset;

      const uploadId =
        status._tag === "pending" && status.upload._tag === "multipart"
          ? status.upload.uploadId
          : yield* Effect.die("expected a multipart upload");

      yield* MediaLibrary.use((library) =>
        library.deleteMedia({ assetId: prepared.asset.id, workspaceId })
      );

      const listed = yield* Effect.flip(
        MediaStorage.use((storage) =>
          storage.listUploadedParts({
            key: prepared.asset.storageKey,
            uploadId,
          })
        )
      );

      assert.strictEqual(listed._tag, "MultipartUploadNotFound");
      assert.deepStrictEqual(yield* recorded(prepared), Option.none());
    })
  );

  it.effect("keeps each workspace's media to itself", () =>
    Effect.gen(function* scoped() {
      const prepared = yield* prepare(yield* freshWorkspace, "image/png", 10);
      const stranger = yield* freshWorkspace;
      const library = yield* MediaLibrary;
      const target = { assetId: prepared.asset.id, workspaceId: stranger };

      const completed = yield* Effect.flip(library.completeUpload(target));
      const deleted = yield* Effect.flip(library.deleteMedia(target));

      assert.strictEqual(completed._tag, "MediaAssetNotFound");
      assert.strictEqual(deleted._tag, "MediaAssetNotFound");
      assert.isTrue(Option.isSome(yield* recorded(prepared)));
    })
  );

  it.effect("probes an uploaded image and marks it ready", () =>
    Effect.gen(function* probes() {
      const workspaceId = yield* freshWorkspace;

      const body = yield* Effect.promise(
        async () =>
          new Uint8Array(
            await sharp({
              create: {
                background: "#ffffff",
                channels: 3,
                height: 9,
                width: 16,
              },
            })
              .png()
              .toBuffer()
          )
      );

      const prepared = yield* prepare(workspaceId, "image/png", body.length);
      const library = yield* MediaLibrary;
      const target = { assetId: prepared.asset.id, workspaceId };

      const early = yield* Effect.flip(library.probeMedia(target));

      assert.strictEqual(early._tag, "InvalidMediaTransition");

      yield* sendSigned(yield* singleRequest(prepared), body);
      yield* complete(prepared);

      const probed = yield* library.probeMedia(target);

      const metadata = new MediaMetadata({
        codec: Option.none(),
        dimensions: Option.some({ height: 9, width: 16 }),
        duration: Option.none(),
      });

      assert.deepStrictEqual(probed.outcome, { _tag: "probed", metadata });
      assert.deepStrictEqual(probed.asset.status, { _tag: "ready" });
      assert.deepStrictEqual(probed.asset.metadata, metadata);
      assert.deepStrictEqual(
        yield* recorded(prepared),
        Option.some(probed.asset)
      );
    })
  );

  it.effect("keeps an asset uploaded when its file cannot be probed", () =>
    Effect.gen(function* unreadable() {
      const workspaceId = yield* freshWorkspace;
      const body = syntheticBytes(64);
      const prepared = yield* prepare(workspaceId, "image/png", body.length);
      const library = yield* MediaLibrary;
      const target = { assetId: prepared.asset.id, workspaceId };

      yield* sendSigned(yield* singleRequest(prepared), body);
      yield* complete(prepared);

      // Not a PNG: the probe fails and the asset stays uploaded.
      const failed = yield* Effect.flip(library.probeMedia(target));

      assert.strictEqual(failed._tag, "MediaProbeFailed");
      assert.strictEqual(
        Option.getOrUndefined(yield* recorded(prepared))?.status._tag,
        "uploaded"
      );
    })
  );
});
