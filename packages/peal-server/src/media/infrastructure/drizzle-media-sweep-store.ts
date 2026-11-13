import { and, asc, eq, inArray, lt, ne } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { MediaSweepStore } from "#media/application/ports/media-sweep-store.ts";
import type {
  ExpiredUpload,
  ListingSweep,
  SweepCursor,
} from "#media/application/ports/media-sweep-store.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import { UploadMethodSchema } from "#media/domain/media-status.ts";
import { StorageKeySchema } from "#media/domain/storage-key.ts";
import type { StorageKey } from "#media/domain/storage-key.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { erasedFolders, mediaAssets, sweepCursors } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const ExpiredUploadSchema = Schema.Struct({
  assetId: MediaAssetIdSchema,
  storageKey: StorageKeySchema,
  upload: UploadMethodSchema,
  workspaceId: WorkspaceIdSchema,
});

const decodeExpired = Schema.decodeUnknownEffect(
  Schema.Array(ExpiredUploadSchema)
);

const decodeWorkspaceIds = Schema.decodeUnknownEffect(
  Schema.Array(WorkspaceIdSchema)
);

const decodeKeys = Schema.decodeUnknownEffect(Schema.Array(StorageKeySchema));

// Kept as a part size and an upload id are, checked as they decode.
const uploadOf = (
  uploadId: string | null,
  partSize: number | null
): typeof UploadMethodSchema.Encoded =>
  uploadId === null || partSize === null
    ? { _tag: "single" }
    : { _tag: "multipart", partSize, uploadId };

/**
 * MediaSweepStore on the media schema: the assets, the sweeps' cursors
 * and the folders of erased workspaces.
 */
export const DrizzleMediaSweepStore = Layer.effect(
  MediaSweepStore,
  Effect.gen(function* DrizzleMediaSweepStore() {
    const db = yield* Drizzle;

    const expiredUploads = Effect.fn("MediaSweepStore.expiredUploads")(
      function* expiredUploads(before: DateTime.Utc, limit: number) {
        const rows = yield* db
          .select({
            assetId: mediaAssets.id,
            partSize: mediaAssets.multipartPartSize,
            storageKey: mediaAssets.storageKey,
            uploadId: mediaAssets.multipartUploadId,
            workspaceId: mediaAssets.workspaceId,
          })
          .from(mediaAssets)
          .where(
            and(
              eq(mediaAssets.status, "pending"),
              lt(mediaAssets.createdAt, DateTime.toDate(before))
            )
          )
          .orderBy(asc(mediaAssets.createdAt))
          .limit(limit)
          .pipe(Effect.mapError(failed));

        const expired: readonly ExpiredUpload[] = yield* decodeExpired(
          rows.map(({ partSize, uploadId, ...row }) => ({
            ...row,
            upload: uploadOf(uploadId, partSize),
          }))
        ).pipe(Effect.mapError(failed));

        return expired;
      }
    );

    const forgetExpired = Effect.fn("MediaSweepStore.forgetExpired")(
      function* forgetExpired(assetId: MediaAssetId, before: DateTime.Utc) {
        const deleted = yield* db
          .delete(mediaAssets)
          .where(
            and(
              eq(mediaAssets.id, assetId),
              eq(mediaAssets.status, "pending"),
              lt(mediaAssets.createdAt, DateTime.toDate(before))
            )
          )
          .returning({ id: mediaAssets.id })
          .pipe(Effect.mapError(failed));

        return deleted.length > 0;
      }
    );

    const keptKeys = Effect.fn("MediaSweepStore.keptKeys")(function* keptKeys(
      keys: readonly StorageKey[]
    ) {
      if (keys.length === 0) {
        return new Set<StorageKey>();
      }

      // A page of the bucket is 1,000 keys at most.
      const rows = yield* db
        .select({ storageKey: mediaAssets.storageKey })
        .from(mediaAssets)
        .where(
          and(
            inArray(mediaAssets.storageKey, [...keys]),
            ne(mediaAssets.status, "rejected")
          )
        )
        .pipe(Effect.mapError(failed));

      const kept = yield* decodeKeys(
        rows.map(({ storageKey }) => storageKey)
      ).pipe(Effect.mapError(failed));

      return new Set(kept);
    });

    const cursor = Effect.fn("MediaSweepStore.cursor")(function* cursor(
      sweep: ListingSweep
    ) {
      const [row] = yield* db
        .select()
        .from(sweepCursors)
        .where(eq(sweepCursors.sweep, sweep))
        .pipe(Effect.mapError(failed));

      return Option.fromUndefinedOr(row).pipe(
        Option.map((found): SweepCursor => ({
          key: found.afterKey,
          uploadId: Option.fromNullishOr(found.afterUploadId),
        }))
      );
    });

    const saveCursor = Effect.fn("MediaSweepStore.saveCursor")(
      function* saveCursor(
        sweep: ListingSweep,
        position: Option.Option<SweepCursor>,
        now: DateTime.Utc
      ) {
        if (Option.isNone(position)) {
          yield* db
            .delete(sweepCursors)
            .where(eq(sweepCursors.sweep, sweep))
            .pipe(Effect.mapError(failed));

          return;
        }

        const row = {
          afterKey: position.value.key,
          afterUploadId: Option.getOrNull(position.value.uploadId),
          sweep,
          updatedAt: DateTime.toDate(now),
        };

        yield* db
          .insert(sweepCursors)
          .values(row)
          .onConflictDoUpdate({
            set: {
              afterKey: row.afterKey,
              afterUploadId: row.afterUploadId,
              updatedAt: row.updatedAt,
            },
            target: sweepCursors.sweep,
          })
          .pipe(Effect.mapError(failed));
      }
    );

    const erased = Effect.fn("MediaSweepStore.erasedFolders")(function* erased(
      before: DateTime.Utc,
      limit: number
    ) {
      const rows = yield* db
        .select({ workspaceId: erasedFolders.workspaceId })
        .from(erasedFolders)
        .where(lt(erasedFolders.erasedAt, DateTime.toDate(before)))
        .orderBy(asc(erasedFolders.erasedAt))
        .limit(limit)
        .pipe(Effect.mapError(failed));

      const ids: readonly WorkspaceId[] = yield* decodeWorkspaceIds(
        rows.map(({ workspaceId }) => workspaceId)
      ).pipe(Effect.mapError(failed));

      return ids;
    });

    const forgetFolder = Effect.fn("MediaSweepStore.forgetFolder")(
      function* forgetFolder(workspaceId: WorkspaceId) {
        yield* db
          .delete(erasedFolders)
          .where(eq(erasedFolders.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));
      }
    );

    return MediaSweepStore.of({
      cursor,
      erasedFolders: erased,
      expiredUploads,
      forgetExpired,
      forgetFolder,
      keptKeys,
      saveCursor,
    });
  })
);
