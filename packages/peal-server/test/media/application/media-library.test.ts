import { assert, layer } from "@effect/vitest";
import {
  ConfigProvider,
  DateTime,
  Duration,
  Effect,
  Fiber,
  Latch,
  Layer,
  Option,
} from "effect";
import { TestClock } from "effect/testing";
import sharp from "sharp";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { StorageAllowance } from "#media/application/ports/storage-allowance.ts";
import {
  CurrentUploadPolicy,
  defaultUploadPolicy,
} from "#media/application/upload-policy.ts";
import { completeUpload } from "#media/application/use-cases/complete-upload.ts";
import { createUpload } from "#media/application/use-cases/create-upload.ts";
import type { PreparedUpload } from "#media/application/use-cases/create-upload.ts";
import { MediaLibrary } from "#media/container.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  damagedPng,
  DatabaseTest,
  fetchBytes,
  hasFfmpeg,
  mebibytes,
  MediaTestLive,
  memberIn,
  sendSigned,
  storageSettings,
  syntheticBytes,
  syntheticSvg,
  syntheticVideo,
} from "#test/media/support.ts";

// The container's layer, plus the ports themselves so tests can look behind
// the use cases.
const LibraryTest = Layer.mergeAll(
  MediaTestLive,
  S3MediaStorageLive,
  DrizzleMediaAssetsLive
).pipe(Layer.provideMerge(DatabaseTest), Layer.provide(storageSettings));

// The same, on a server without ffprobe.
const WithoutFfprobeTest = LibraryTest.pipe(
  Layer.provide(
    ConfigProvider.layerAdd(
      ConfigProvider.fromUnknown({
        PEAL_FFPROBE_PATH: "/nonexistent/peal-test/ffprobe",
      })
    )
  )
);

// Parts of the stores' 5 MiB minimum, so a multipart test moves 11 MiB.
const smallParts = {
  ...defaultUploadPolicy,
  multipartThreshold: mebibytes(5),
  partSize: mebibytes(5),
};

const freshWorkspace: Effect.Effect<WorkspaceId, never, Ids> = Ids.use(
  (ids) => ids.next
).pipe(Effect.map((uuid) => WorkspaceIdSchema.make(uuid)));

// Creates an upload, whose file and multipart upload go with the test.
const prepare = Effect.fn("prepare")(function* prepare(
  workspaceId: WorkspaceId,
  contentType: string,
  byteSize: number
) {
  const library = yield* MediaLibrary;
  const storage = yield* MediaStorage;

  const prepared = yield* library.createUpload(memberIn(workspaceId), {
    altText: Option.none(),
    byteSize,
    contentType,
  });

  const { status, storageKey } = prepared.asset;

  yield* Effect.addFinalizer(() =>
    Effect.gen(function* cleanUp() {
      if (status._tag === "pending" && status.upload._tag === "multipart") {
        yield* storage.abortMultipartUpload({
          key: storageKey,
          uploadId: status.upload.uploadId,
        });
      }

      yield* storage.remove(storageKey);
    }).pipe(Effect.orDie)
  );

  return prepared;
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
    library.completeUpload(
      memberIn(prepared.asset.workspaceId),
      prepared.asset.id
    )
  );

const recorded = (prepared: PreparedUpload) =>
  MediaAssets.use((assets) =>
    assets.findById(prepared.asset.workspaceId, prepared.asset.id)
  );

const whitePng = (width: number, height: number) =>
  Effect.promise(
    async () =>
      new Uint8Array(
        await sharp({
          create: { background: "#ffffff", channels: 3, height, width },
        })
          .png()
          .toBuffer()
      )
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

      assert.deepStrictEqual(uploaded.status, {
        _tag: "uploaded",
        probe: "pending",
      });
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

      assert.deepStrictEqual(uploaded.status, {
        _tag: "uploaded",
        probe: "pending",
      });
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

  it.effect("completes parts the store joined before the asset was saved", () =>
    Effect.gen(function* joinedNotSaved() {
      const workspaceId = yield* freshWorkspace;
      const storage = yield* MediaStorage;
      const body = syntheticBytes(mebibytes(6));

      const prepared = yield* prepare(
        workspaceId,
        "video/mp4",
        body.length
      ).pipe(Effect.provideService(CurrentUploadPolicy, smallParts));

      const parts = yield* multipartParts(prepared);
      const { status } = prepared.asset;

      const uploadId =
        status._tag === "pending" && status.upload._tag === "multipart"
          ? status.upload.uploadId
          : yield* Effect.die("expected a multipart upload");

      for (const part of parts) {
        const start = (part.partNumber - 1) * mebibytes(5);

        yield* sendSigned(
          part.request,
          body.slice(start, start + part.byteSize)
        );
      }

      // An earlier call joined the parts, then failed before saving.
      const upload = { key: prepared.asset.storageKey, uploadId };

      yield* storage.completeMultipartUpload(
        upload,
        yield* storage.listUploadedParts(upload)
      );

      const uploaded = yield* complete(prepared);

      assert.deepStrictEqual(uploaded.status, {
        _tag: "uploaded",
        probe: "pending",
      });
      assert.deepStrictEqual(yield* recorded(prepared), Option.some(uploaded));
    })
  );

  it.effect("keeps what a later call saved when an earlier one finishes", () =>
    Effect.gen(function* overlapping() {
      const workspaceId = yield* freshWorkspace;
      const storage = yield* MediaStorage;
      const library = yield* MediaLibrary;
      const body = yield* whitePng(16, 9);
      const prepared = yield* prepare(workspaceId, "image/png", body.length);
      const target = { assetId: prepared.asset.id, workspaceId };
      const member = memberIn(workspaceId);

      yield* sendSigned(yield* singleRequest(prepared), body);

      // The first call reads the asset, then waits on a slow store.
      const reached = yield* Latch.make();
      const resume = yield* Latch.make();

      const slowStorage = MediaStorage.of({
        ...storage,
        head: (key) =>
          reached.open.pipe(
            Effect.andThen(resume.await),
            Effect.andThen(storage.head(key))
          ),
      });

      const slow = yield* completeUpload(target).pipe(
        Effect.provideService(MediaStorage, slowStorage),
        Effect.provideService(StorageAllowance, StorageAllowance.unlimited),
        Effect.forkChild
      );

      yield* reached.await;

      // Meanwhile a retry completes it, and the probe marks it ready.
      yield* library.completeUpload(member, prepared.asset.id);

      const { asset: ready } = yield* library.probeMedia(
        member,
        prepared.asset.id
      );

      yield* resume.open;

      assert.deepStrictEqual(yield* Fiber.join(slow), ready);
      assert.deepStrictEqual(yield* recorded(prepared), Option.some(ready));
      assert.deepStrictEqual(
        ready.metadata.dimensions,
        Option.some({ height: 9, width: 16 })
      );
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

        // A retry, after the first answer was lost, gets the same one.
        const again = yield* Effect.flip(complete(prepared));

        assert.include(again, { _tag: "UploadRejected", reason });
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

      yield* library.deleteMedia(memberIn(workspaceId), prepared.asset.id);

      assert.deepStrictEqual(yield* recorded(prepared), Option.none());
      assert.deepStrictEqual(yield* storedObject(prepared), Option.none());
      assert.strictEqual((yield* fetchBytes(url)).response.status, 404);

      const again = yield* Effect.flip(
        library.deleteMedia(memberIn(workspaceId), prepared.asset.id)
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
        library.deleteMedia(memberIn(workspaceId), prepared.asset.id)
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
      const member = memberIn(stranger);
      const { id } = prepared.asset;

      const completed = yield* Effect.flip(library.completeUpload(member, id));
      const deleted = yield* Effect.flip(library.deleteMedia(member, id));
      const read = yield* Effect.flip(library.getMedia(member, id));

      const described = yield* Effect.flip(
        library.describeMedia(member, id, Option.some("Not theirs"))
      );

      const listed = yield* library.listMedia(member, {
        after: Option.none(),
        limit: 10,
      });

      assert.strictEqual(completed._tag, "MediaAssetNotFound");
      assert.strictEqual(deleted._tag, "MediaAssetNotFound");
      assert.strictEqual(read._tag, "MediaAssetNotFound");
      assert.strictEqual(described._tag, "MediaAssetNotFound");
      assert.deepStrictEqual(listed.items, []);
      assert.isTrue(Option.isSome(yield* recorded(prepared)));
    })
  );

  it.effect("probes an uploaded image and marks it ready", () =>
    Effect.gen(function* probes() {
      const workspaceId = yield* freshWorkspace;

      const body = yield* whitePng(16, 9);
      const prepared = yield* prepare(workspaceId, "image/png", body.length);
      const library = yield* MediaLibrary;

      const probe = () =>
        library.probeMedia(memberIn(workspaceId), prepared.asset.id);

      const early = yield* Effect.flip(probe());

      assert.strictEqual(early._tag, "InvalidMediaTransition");

      yield* sendSigned(yield* singleRequest(prepared), body);
      yield* complete(prepared);

      const probed = yield* probe();

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
      const body = damagedPng(64);
      const prepared = yield* prepare(workspaceId, "image/png", body.length);
      const library = yield* MediaLibrary;
      yield* sendSigned(yield* singleRequest(prepared), body);
      yield* complete(prepared);

      // A damaged PNG: the probe fails and the asset stays uploaded.
      const failed = yield* Effect.flip(
        library.probeMedia(memberIn(workspaceId), prepared.asset.id)
      );

      assert.include(failed, {
        _tag: "MediaProbeFailed",
        reason: "unreadable",
      });
      assert.deepStrictEqual(
        Option.getOrUndefined(yield* recorded(prepared))?.status,
        { _tag: "uploaded", probe: "unreadable" }
      );
    })
  );

  it.effect("rejects an image that is not in the declared format", () =>
    Effect.gen(function* notDeclared() {
      const workspaceId = yield* freshWorkspace;
      const body = syntheticSvg();
      const prepared = yield* prepare(workspaceId, "image/png", body.length);
      const library = yield* MediaLibrary;
      yield* sendSigned(yield* singleRequest(prepared), body);
      yield* complete(prepared);

      // The store took it as a PNG of the declared size, but it is an SVG.
      const rejected = yield* Effect.flip(
        library.probeMedia(memberIn(workspaceId), prepared.asset.id)
      );

      assert.include(rejected, {
        _tag: "UploadRejected",
        reason: "typeMismatch",
      });
      assert.deepStrictEqual(
        Option.getOrUndefined(yield* recorded(prepared))?.status,
        { _tag: "rejected", reason: "typeMismatch" }
      );
      assert.deepStrictEqual(yield* storedObject(prepared), Option.none());
      assert.include(yield* Effect.flip(complete(prepared)), {
        _tag: "UploadRejected",
        reason: "typeMismatch",
      });
    })
  );

  it.effect("finishes an image upload by probing it at once", () =>
    Effect.gen(function* finishesImage() {
      const workspaceId = yield* freshWorkspace;
      const body = yield* whitePng(16, 9);
      const prepared = yield* prepare(workspaceId, "image/png", body.length);
      const library = yield* MediaLibrary;

      const finish = () =>
        library.finishUpload(memberIn(workspaceId), prepared.asset.id);

      yield* sendSigned(yield* singleRequest(prepared), body);

      const { asset: ready, url } = yield* finish();

      assert.deepStrictEqual(ready.status, { _tag: "ready" });
      assert.deepStrictEqual(
        ready.metadata.dimensions,
        Option.some({ height: 9, width: 16 })
      );

      const { bytes } = yield* fetchBytes(Option.getOrElse(url, () => ""));

      assert.deepStrictEqual(bytes, body);

      // Finishing again answers the same.
      assert.deepStrictEqual((yield* finish()).asset, ready);
    })
  );

  it.effect.skipIf(!hasFfmpeg)("finishes a video upload with ffprobe", () =>
    Effect.gen(function* withFfprobe() {
      const workspaceId = yield* freshWorkspace;
      const body = syntheticVideo();
      const prepared = yield* prepare(workspaceId, "video/mp4", body.length);

      yield* sendSigned(yield* singleRequest(prepared), body);

      const { asset: ready } = yield* MediaLibrary.use((library) =>
        library.finishUpload(memberIn(workspaceId), prepared.asset.id)
      );

      assert.deepStrictEqual(ready.status, { _tag: "ready" });
      assert.deepStrictEqual(
        ready.metadata.dimensions,
        Option.some({ height: 240, width: 320 })
      );
      assert.deepStrictEqual(ready.metadata.codec, Option.some("mpeg4"));
    })
  );

  it.effect("keeps a damaged file uploaded with why it was not probed", () =>
    Effect.gen(function* damaged() {
      const workspaceId = yield* freshWorkspace;
      const body = damagedPng(64);
      const prepared = yield* prepare(workspaceId, "image/png", body.length);

      yield* sendSigned(yield* singleRequest(prepared), body);

      const { asset: finished } = yield* MediaLibrary.use((library) =>
        library.finishUpload(memberIn(workspaceId), prepared.asset.id)
      );

      assert.deepStrictEqual(finished.status, {
        _tag: "uploaded",
        probe: "unreadable",
      });
    })
  );

  it.effect("refuses what the actor's permissions do not allow", () =>
    Effect.gen(function* permissions() {
      const workspaceId = yield* freshWorkspace;
      const library = yield* MediaLibrary;
      const prepared = yield* prepare(workspaceId, "image/png", 10);
      const { id } = prepared.asset;
      const viewer = memberIn(workspaceId, ["media:read"]);
      const stranger = memberIn(workspaceId, ["post:read"]);

      const upload = {
        altText: Option.none(),
        byteSize: 10,
        contentType: "image/png",
      };

      const refusals = [
        yield* Effect.flip(library.createUpload(viewer, upload)),
        yield* Effect.flip(library.finishUpload(viewer, id)),
        yield* Effect.flip(library.describeMedia(viewer, id, Option.none())),
        yield* Effect.flip(library.deleteMedia(viewer, id)),
        yield* Effect.flip(library.getMedia(stranger, id)),
        yield* Effect.flip(
          library.listMedia(stranger, { after: Option.none(), limit: 10 })
        ),
      ];

      assert.deepStrictEqual(
        refusals.map((refusal) =>
          refusal._tag === "MissingPermission"
            ? refusal.permission
            : refusal._tag
        ),
        [
          "media:upload",
          "media:upload",
          "media:upload",
          "media:delete",
          "media:read",
          "media:read",
        ]
      );
      assert.deepStrictEqual(
        yield* recorded(prepared),
        Option.some(prepared.asset)
      );
    })
  );

  it.effect("describes media, also while it uploads", () =>
    Effect.gen(function* describes() {
      const workspaceId = yield* freshWorkspace;
      const library = yield* MediaLibrary;
      const member = memberIn(workspaceId);

      const prepared = yield* library.createUpload(member, {
        altText: Option.some("  A white square  "),
        byteSize: 100,
        contentType: "image/png",
      });

      const { id } = prepared.asset;

      assert.deepStrictEqual(
        prepared.asset.altText,
        Option.some("A white square")
      );

      const { asset: described } = yield* library.describeMedia(
        member,
        id,
        Option.some("A white square on white")
      );

      assert.deepStrictEqual(
        described.altText,
        Option.some("A white square on white")
      );
      assert.deepStrictEqual(described.status, prepared.asset.status);

      const { asset: cleared } = yield* library.describeMedia(
        member,
        id,
        Option.some(" ")
      );

      assert.deepStrictEqual(cleared.altText, Option.none());

      const tooLong = yield* Effect.flip(
        library.describeMedia(member, id, Option.some("a".repeat(2001)))
      );

      assert.strictEqual(tooLong._tag, "AltTextTooLong");
      yield* library.deleteMedia(member, id);
    })
  );

  it.effect("lists media newest first, with URLs for stored files", () =>
    Effect.gen(function* lists() {
      const workspaceId = yield* freshWorkspace;
      const library = yield* MediaLibrary;
      const member = memberIn(workspaceId);
      const body = syntheticBytes(300);
      const stored = yield* prepare(workspaceId, "image/gif", body.length);
      const waiting = yield* prepare(workspaceId, "image/png", 10);

      yield* sendSigned(yield* singleRequest(stored), body);
      yield* complete(stored);

      const page = yield* library.listMedia(member, {
        after: Option.none(),
        limit: 1,
      });

      assert.deepStrictEqual(
        page.items.map(({ asset, url }) => [asset.id, Option.isSome(url)]),
        [[waiting.asset.id, false]]
      );

      const next = yield* library.listMedia(member, {
        after: page.next,
        limit: 1,
      });

      const [item] = next.items;

      assert.strictEqual(item?.asset.id, stored.asset.id);
      assert.deepStrictEqual(next.next, Option.none());

      const { bytes } = yield* fetchBytes(
        Option.getOrElse(item?.url ?? Option.none(), () => "")
      );

      assert.deepStrictEqual(bytes, body);

      const shown = yield* library.getMedia(member, stored.asset.id);

      assert.isTrue(Option.isSome(shown.url));
    })
  );
});

layer(WithoutFfprobeTest)("the media library without ffprobe", (it) => {
  it.effect(
    "leaves a video uploaded, its probe unavailable, without ffprobe",
    () =>
      Effect.gen(function* noFfprobe() {
        const workspaceId = yield* freshWorkspace;
        const body = syntheticBytes(4096);
        const prepared = yield* prepare(workspaceId, "video/mp4", body.length);

        yield* sendSigned(yield* singleRequest(prepared), body);

        const { asset: finished } = yield* MediaLibrary.use((library) =>
          library.finishUpload(memberIn(workspaceId), prepared.asset.id)
        );

        assert.deepStrictEqual(finished.status, {
          _tag: "uploaded",
          probe: "unavailable",
        });
        assert.deepStrictEqual(finished.metadata, MediaMetadata.unknown);
        assert.deepStrictEqual(
          yield* recorded(prepared),
          Option.some(finished)
        );
      })
  );
});

// A plan with room for one of the two files below.
const smallStorage = StorageAllowance.of({
  bytes: () => Effect.succeed(Option.some(8000)),
  sharedWith: () => Effect.succeed([]),
});

layer(LibraryTest)("an upload finished after its room lapsed", (it) => {
  it.effect("is refused when the plan's storage filled meanwhile", () =>
    Effect.gen(function* lapsed() {
      const workspaceId = yield* freshWorkspace;
      const storage = yield* MediaStorage;
      const body = syntheticBytes(5000);

      const start = createUpload({
        altText: Option.none(),
        byteSize: body.length,
        contentType: "image/webp",
        workspaceId,
      }).pipe(Effect.provideService(StorageAllowance, smallStorage));

      const finish = (prepared: PreparedUpload) =>
        completeUpload({ assetId: prepared.asset.id, workspaceId }).pipe(
          Effect.provideService(StorageAllowance, smallStorage)
        );

      const send = (prepared: PreparedUpload) =>
        singleRequest(prepared).pipe(
          Effect.flatMap((request) => sendSigned(request, body))
        );

      const late = yield* start;

      yield* Effect.addFinalizer(() =>
        storage.remove(late.asset.storageKey).pipe(Effect.orDie)
      );
      yield* send(late);

      // Its file arrived, but nobody said so: past its URLs' life, the
      // room held for it is given to others.
      yield* TestClock.adjust(
        Duration.sum(defaultUploadPolicy.partUploadExpiry, Duration.minutes(1))
      );

      const other = yield* start;

      yield* Effect.addFinalizer(() =>
        storage.remove(other.asset.storageKey).pipe(Effect.orDie)
      );
      yield* send(other);

      assert.strictEqual((yield* finish(other)).status._tag, "uploaded");

      // No room is left for the first: it is refused, and its file goes.
      assert.deepInclude(yield* Effect.flip(finish(late)), {
        _tag: "PlanLimitReached",
        allowed: 8000,
        limit: "mediaStorage",
        needed: 10_000,
        used: 5000,
      });
      assert.deepStrictEqual(
        yield* storage.head(late.asset.storageKey),
        Option.none()
      );
      assert.strictEqual(
        (yield* Effect.flip(finish(late)))._tag,
        "UploadIncomplete"
      );
    })
  );

  it.effect("is kept while the plan still has room for it", () =>
    Effect.gen(function* roomLeft() {
      const workspaceId = yield* freshWorkspace;
      const storage = yield* MediaStorage;
      const body = syntheticBytes(5000);

      const late = yield* createUpload({
        altText: Option.none(),
        byteSize: body.length,
        contentType: "image/webp",
        workspaceId,
      }).pipe(Effect.provideService(StorageAllowance, smallStorage));

      yield* Effect.addFinalizer(() =>
        storage.remove(late.asset.storageKey).pipe(Effect.orDie)
      );
      yield* sendSigned(yield* singleRequest(late), body);
      yield* TestClock.adjust(
        Duration.sum(defaultUploadPolicy.partUploadExpiry, Duration.minutes(1))
      );

      const finished = yield* completeUpload({
        assetId: late.asset.id,
        workspaceId,
      }).pipe(Effect.provideService(StorageAllowance, smallStorage));

      assert.strictEqual(finished.status._tag, "uploaded");
    })
  );
});
