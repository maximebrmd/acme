import { asc, eq } from "drizzle-orm";
import { DateTime, Duration, Effect, Layer, Schema } from "effect";

import { MediaRecords } from "#media/application/media-records.ts";
import { MediaFolders } from "#media/application/ports/media-folders.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { StorageKeySchema } from "#media/domain/storage-key.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { mediaAssets } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

// A copy of the data holds a link to each file the user uploaded, as
// portability asks for what they provided: presigned, even when the bucket
// is served publicly, for the longest a presigned GET works.
export const downloadLifetime = Duration.days(7);

// The statuses whose file the store holds.
const stored: ReadonlySet<string> = new Set(["uploaded", "ready"]);

const decodeKey = Schema.decodeUnknownEffect(StorageKeySchema);

/**
 * MediaRecords on the media schema, with the store's MediaFolders, and its
 * links for the files an export lists.
 */
export const DrizzleMediaRecords = Layer.effect(
  MediaRecords,
  Effect.gen(function* DrizzleMediaRecords() {
    const db = yield* Drizzle;
    const folders = yield* MediaFolders;
    const storage = yield* MediaStorage;

    // A link the store could not sign is left out: the rest of the copy
    // still goes, and the file can be downloaded from the library.
    const downloadUrlOf = (storageKey: string, status: string) =>
      stored.has(status)
        ? decodeKey(storageKey).pipe(
            Effect.flatMap((key) => storage.downloadUrl(key, downloadLifetime)),
            Effect.catch(() =>
              Effect.logWarning(
                "A media file's download link could not be made for an export"
              ).pipe(Effect.as(null))
            )
          )
        : Effect.succeed(null);

    return MediaRecords.of({
      eraseWorkspace: Effect.fn("MediaRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId) {
          yield* db
            .delete(mediaAssets)
            .where(eq(mediaAssets.workspaceId, workspaceId))
            .pipe(Effect.mapError(failed));
        }
      ),
      exportWorkspace: Effect.fn("MediaRecords.exportWorkspace")(
        function* exportWorkspace(workspaceId) {
          const rows = yield* db
            .select({
              altText: mediaAssets.altText,
              byteSize: mediaAssets.byteSize,
              contentType: mediaAssets.contentType,
              createdAt: mediaAssets.createdAt,
              durationMs: mediaAssets.durationMs,
              height: mediaAssets.height,
              id: mediaAssets.id,
              pageCount: mediaAssets.pageCount,
              status: mediaAssets.status,
              storageKey: mediaAssets.storageKey,
              width: mediaAssets.width,
            })
            .from(mediaAssets)
            .where(eq(mediaAssets.workspaceId, workspaceId))
            .orderBy(asc(mediaAssets.id))
            .pipe(Effect.mapError(failed));

          return yield* Effect.all(
            rows.map(({ storageKey, ...row }) =>
              downloadUrlOf(storageKey, row.status).pipe(
                Effect.map((downloadUrl) => ({
                  ...row,
                  createdAt: DateTime.fromDateUnsafe(row.createdAt),
                  downloadUrl,
                }))
              )
            )
          );
        }
      ),
      removeWorkspaceFiles: (workspaceId) =>
        folders.removeWorkspace(workspaceId),
    });
  })
);
