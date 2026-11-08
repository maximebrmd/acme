import { and, eq } from "drizzle-orm";
import { DateTime, Duration, Effect, Layer, Option, Schema } from "effect";

import { MediaAssetNotFound } from "#media/application/media-asset-not-found.ts";
import { MediaAssets } from "#media/application/ports/media-assets.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import { MediaAsset } from "#media/domain/media-asset.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { mediaAssets } from "./schema.ts";

type Row = typeof mediaAssets.$inferSelect;

type NewRow = typeof mediaAssets.$inferInsert;

const decodeAsset = Schema.decodeUnknownEffect(MediaAsset);

const toRow = (asset: MediaAsset): NewRow => {
  const { metadata, status } = asset;
  const dimensions = Option.getOrNull(metadata.dimensions);

  const multipart =
    status._tag === "pending" && status.upload._tag === "multipart"
      ? status.upload
      : null;

  return {
    byteSize: asset.byteSize,
    codec: Option.getOrNull(metadata.codec),
    contentType: asset.contentType,
    createdAt: DateTime.toDate(asset.createdAt),
    durationMs: metadata.duration.pipe(
      Option.map((duration) => Math.round(Duration.toMillis(duration))),
      Option.getOrNull
    ),
    height: dimensions?.height ?? null,
    id: asset.id,
    multipartPartSize: multipart?.partSize ?? null,
    multipartUploadId: multipart?.uploadId ?? null,
    rejectionReason: status._tag === "rejected" ? status.reason : null,
    status: status._tag,
    storageKey: asset.storageKey,
    updatedAt: DateTime.toDate(asset.updatedAt),
    width: dimensions?.width ?? null,
    workspaceId: asset.workspaceId,
  };
};

// The status in MediaStatus's encoded form, checked when the asset decodes.
const statusOf = (row: Row) => {
  if (row.status === "pending") {
    return {
      _tag: "pending",
      upload:
        row.multipartUploadId === null
          ? { _tag: "single" }
          : {
              _tag: "multipart",
              partSize: row.multipartPartSize,
              uploadId: row.multipartUploadId,
            },
    };
  }

  if (row.status === "rejected") {
    return { _tag: "rejected", reason: row.rejectionReason };
  }

  return { _tag: row.status };
};

const dimensionsOf = (row: Row) =>
  row.width === null || row.height === null
    ? Option.none()
    : Option.some({ height: row.height, width: row.width });

// A row that does not decode was written by something other than this
// repository: a bug, not a failure callers can handle.
const fromRow = (row: Row): Effect.Effect<MediaAsset> =>
  decodeAsset({
    byteSize: row.byteSize,
    contentType: row.contentType,
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    id: row.id,
    metadata: {
      codec: Option.fromNullOr(row.codec),
      dimensions: dimensionsOf(row),
      duration: Option.fromNullOr(row.durationMs).pipe(
        Option.map(Duration.millis)
      ),
    },
    status: statusOf(row),
    storageKey: row.storageKey,
    updatedAt: DateTime.fromDateUnsafe(row.updatedAt),
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const byId = (workspaceId: WorkspaceId, assetId: MediaAssetId) =>
  and(eq(mediaAssets.workspaceId, workspaceId), eq(mediaAssets.id, assetId));

/**
 * Media assets in Postgres, through Drizzle. A database failure is a defect
 * here: no caller can do better than report it.
 */
export const DrizzleMediaAssetsLive = Layer.effect(
  MediaAssets,
  Effect.gen(function* DrizzleMediaAssetsLive() {
    const db = yield* Drizzle;

    return MediaAssets.of({
      findById: Effect.fn("MediaAssets.findById")(function* findById(
        workspaceId: WorkspaceId,
        assetId: MediaAssetId
      ) {
        const rows = yield* db
          .select()
          .from(mediaAssets)
          .where(byId(workspaceId, assetId))
          .pipe(Effect.orDie);

        const [row] = rows;

        return row === undefined
          ? Option.none()
          : Option.some(yield* fromRow(row));
      }),
      insert: Effect.fn("MediaAssets.insert")(function* insert(
        asset: MediaAsset
      ) {
        yield* db.insert(mediaAssets).values(toRow(asset)).pipe(Effect.orDie);
      }),
      remove: Effect.fn("MediaAssets.remove")(function* remove(
        workspaceId: WorkspaceId,
        assetId: MediaAssetId
      ) {
        yield* db
          .delete(mediaAssets)
          .where(byId(workspaceId, assetId))
          .pipe(Effect.orDie);
      }),
      update: Effect.fn("MediaAssets.update")(function* update(
        asset: MediaAsset
      ) {
        const updated = yield* db
          .update(mediaAssets)
          .set(toRow(asset))
          .where(byId(asset.workspaceId, asset.id))
          .returning({ id: mediaAssets.id })
          .pipe(Effect.orDie);

        if (updated.length === 0) {
          yield* new MediaAssetNotFound({ assetId: asset.id });
        }
      }),
    });
  })
);
