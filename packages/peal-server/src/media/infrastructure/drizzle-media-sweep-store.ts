import { and, asc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { MediaSweepStore } from "#media/application/ports/media-sweep-store.ts";
import type {
  DatabaseCluster,
  ExpiredPosition,
  ExpiredUpload,
  ListingSweep,
  StoreIdentity,
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

import {
  erasedFolders,
  mediaAssets,
  storeIdentity,
  sweepCursors,
} from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const ExpiredUploadSchema = Schema.Struct({
  assetId: MediaAssetIdSchema,
  createdAt: Schema.DateTimeUtcFromDate,
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

const decodeCluster = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({ system: Schema.NonEmptyString, timeline: Schema.Int })
  )
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
    const client = yield* SqlClient.SqlClient;

    const expiredUploads = Effect.fn("MediaSweepStore.expiredUploads")(
      function* expiredUploads(
        before: DateTime.Utc,
        limit: number,
        after: Option.Option<ExpiredPosition>
      ) {
        const rows = yield* db
          .select({
            assetId: mediaAssets.id,
            createdAt: mediaAssets.createdAt,
            partSize: mediaAssets.multipartPartSize,
            storageKey: mediaAssets.storageKey,
            uploadId: mediaAssets.multipartUploadId,
            workspaceId: mediaAssets.workspaceId,
          })
          .from(mediaAssets)
          .where(
            and(
              eq(mediaAssets.status, "pending"),
              lt(mediaAssets.createdAt, DateTime.toDate(before)),
              after.pipe(
                Option.map(
                  ({ assetId, createdAt }) =>
                    sql`(${mediaAssets.createdAt}, ${mediaAssets.id}) > (${DateTime.toDate(createdAt)}, ${assetId})`
                ),
                Option.getOrUndefined
              )
            )
          )
          .orderBy(asc(mediaAssets.createdAt), asc(mediaAssets.id))
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

    const holdsAssets = Effect.fn("MediaSweepStore.holdsAssets")(
      function* holdsAssets(workspaceId: WorkspaceId) {
        const rows = yield* db
          .select({ id: mediaAssets.id })
          .from(mediaAssets)
          .where(eq(mediaAssets.workspaceId, workspaceId))
          .limit(1)
          .pipe(Effect.mapError(failed));

        return rows.length > 0;
      }
    );

    const identity = Effect.fn("MediaSweepStore.identity")(function* identity(
      candidate: string
    ) {
      yield* db
        .insert(storeIdentity)
        .values({
          createdAt: DateTime.toDate(yield* DateTime.now),
          id: candidate,
          singleton: true,
        })
        .onConflictDoNothing()
        .pipe(Effect.mapError(failed));

      const [row] = yield* db
        .select()
        .from(storeIdentity)
        .pipe(Effect.mapError(failed));

      if (row === undefined) {
        return yield* new DatabaseError({ cause: "No store identity" });
      }

      const found: StoreIdentity = {
        claimed: row.claimedAt !== null,
        epoch: row.epoch,
        id: row.id,
      };

      return found;
    });

    const markClaimed = Effect.gen(function* markClaimed() {
      yield* db
        .update(storeIdentity)
        .set({ claimedAt: DateTime.toDate(yield* DateTime.now) })
        .where(isNull(storeIdentity.claimedAt))
        .pipe(Effect.mapError(failed));
    }).pipe(Effect.withSpan("MediaSweepStore.markClaimed"));

    const advanceEpoch = Effect.gen(function* advanceEpoch() {
      const [row] = yield* db
        .update(storeIdentity)
        .set({ epoch: sql`${storeIdentity.epoch} + 1` })
        .returning({ epoch: storeIdentity.epoch })
        .pipe(Effect.mapError(failed));

      if (row === undefined) {
        return yield* new DatabaseError({ cause: "No store identity" });
      }

      return row.epoch;
    }).pipe(Effect.withSpan("MediaSweepStore.advanceEpoch"));

    // Any role may read them: no privilege needed.
    const cluster = Effect.gen(function* cluster() {
      const rows =
        yield* client`SELECT (SELECT system_identifier::text FROM pg_control_system()) AS system, (SELECT timeline_id FROM pg_control_checkpoint()) AS timeline`.pipe(
          Effect.mapError(failed)
        );

      const [found] = yield* decodeCluster(rows).pipe(Effect.mapError(failed));

      if (found === undefined) {
        return yield* new DatabaseError({ cause: "No control data" });
      }

      const read: DatabaseCluster = found;

      return read;
    }).pipe(Effect.withSpan("MediaSweepStore.cluster"));

    const forgetFolder = Effect.fn("MediaSweepStore.forgetFolder")(
      function* forgetFolder(workspaceId: WorkspaceId) {
        yield* db
          .delete(erasedFolders)
          .where(eq(erasedFolders.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));
      }
    );

    return MediaSweepStore.of({
      advanceEpoch,
      cluster,
      cursor,
      erasedFolders: erased,
      expiredUploads,
      forgetExpired,
      forgetFolder,
      holdsAssets,
      identity,
      keptKeys,
      markClaimed,
      saveCursor,
    });
  })
);
