import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option } from "effect";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { MediaAsset, startUpload } from "#media/domain/media-asset.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";
import type { MediaStatus } from "#media/domain/media-status.ts";
import { MultipartUploadIdSchema } from "#media/domain/media-status.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/media/support.ts";

const RepositoryTest = DrizzleMediaAssetsLive.pipe(
  Layer.provideMerge(DatabaseTest)
);

const createdAt = DateTime.makeUnsafe("2026-06-15T07:00:00.123Z");

const later = DateTime.makeUnsafe("2026-06-15T07:05:00.456Z");

// A pending video in a workspace of its own.
const freshAsset = Effect.gen(function* freshAsset() {
  const ids = yield* Ids;
  const workspaceId = WorkspaceIdSchema.make(yield* ids.next);
  const id = MediaAssetIdSchema.make(yield* ids.next);

  return startUpload(
    {
      accepted: {
        byteSize: 3_000_000_000,
        contentType: "video/quicktime",
        kind: "video",
      },
      id,
      upload: { _tag: "single" },
      workspaceId,
    },
    createdAt
  );
});

const changed = (
  asset: MediaAsset,
  status: MediaStatus,
  metadata = asset.metadata
): MediaAsset =>
  new MediaAsset({
    byteSize: asset.byteSize,
    contentType: asset.contentType,
    createdAt: asset.createdAt,
    id: asset.id,
    metadata,
    status,
    storageKey: asset.storageKey,
    updatedAt: later,
    workspaceId: asset.workspaceId,
  });

const probed = new MediaMetadata({
  codec: Option.some("h264"),
  dimensions: Option.some({ height: 1920, width: 1080 }),
  duration: Option.some(Duration.millis(12_345)),
});

layer(RepositoryTest)("the Drizzle media assets", (it) => {
  it.effect("keeps every status and what a probe found", () =>
    Effect.gen(function* roundTrips() {
      const assets = yield* MediaAssets;
      const asset = yield* freshAsset;

      yield* assets.insert(asset);

      const found = (): Effect.Effect<Option.Option<MediaAsset>> =>
        assets.findById(asset.workspaceId, asset.id);

      assert.deepStrictEqual(yield* found(), Option.some(asset));

      const versions = [
        changed(asset, {
          _tag: "pending",
          upload: {
            _tag: "multipart",
            partSize: 8 * 1024 * 1024,
            uploadId: MultipartUploadIdSchema.make("synthetic-upload-id"),
          },
        }),
        changed(asset, { _tag: "uploaded" }),
        changed(asset, { _tag: "ready" }, probed),
        changed(asset, { _tag: "rejected", reason: "typeMismatch" }),
      ];

      for (const version of versions) {
        yield* assets.update(version);

        assert.deepStrictEqual(yield* found(), Option.some(version));
      }
    })
  );

  it.effect("finds an asset only in its own workspace", () =>
    Effect.gen(function* scoped() {
      const assets = yield* MediaAssets;
      const asset = yield* freshAsset;
      const other = yield* freshAsset;

      yield* assets.insert(asset);

      assert.deepStrictEqual(
        yield* assets.findById(other.workspaceId, asset.id),
        Option.none()
      );

      yield* assets.remove(other.workspaceId, asset.id);

      assert.isTrue(
        Option.isSome(yield* assets.findById(asset.workspaceId, asset.id))
      );
    })
  );

  it.effect("removes an asset, and does not bring it back on update", () =>
    Effect.gen(function* removes() {
      const assets = yield* MediaAssets;
      const asset = yield* freshAsset;

      yield* assets.insert(asset);
      yield* assets.remove(asset.workspaceId, asset.id);
      yield* assets.remove(asset.workspaceId, asset.id);

      const error = yield* Effect.flip(
        assets.update(changed(asset, { _tag: "uploaded" }))
      );

      assert.strictEqual(error._tag, "MediaAssetNotFound");
      assert.deepStrictEqual(
        yield* assets.findById(asset.workspaceId, asset.id),
        Option.none()
      );
    })
  );
});
