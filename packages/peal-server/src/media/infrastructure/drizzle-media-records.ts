import { asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { MediaRecords } from "#media/application/media-records.ts";
import { MediaFolders } from "#media/application/ports/media-folders.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { mediaAssets } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/** MediaRecords on the media schema, with the store's MediaFolders. */
export const DrizzleMediaRecords = Layer.effect(
  MediaRecords,
  Effect.gen(function* DrizzleMediaRecords() {
    const db = yield* Drizzle;
    const folders = yield* MediaFolders;

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
              status: mediaAssets.status,
              width: mediaAssets.width,
            })
            .from(mediaAssets)
            .where(eq(mediaAssets.workspaceId, workspaceId))
            .orderBy(asc(mediaAssets.id))
            .pipe(Effect.mapError(failed));

          return rows.map((row) => ({
            ...row,
            createdAt: DateTime.fromDateUnsafe(row.createdAt),
          }));
        }
      ),
      removeWorkspaceFiles: (workspaceId) =>
        folders.removeWorkspace(workspaceId),
    });
  })
);
