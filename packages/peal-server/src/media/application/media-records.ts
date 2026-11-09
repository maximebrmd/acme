import { Context } from "effect";
import type { Effect } from "effect";

import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { MediaRecord } from "#shared/application/personal-data.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * A workspace's media as a whole, for the workspace context when a
 * workspace's data is exported or erased: the assets' records, in the
 * database, and their files, in the store, which go apart since the store
 * takes no part in a transaction.
 */
export class MediaRecords extends Context.Service<
  MediaRecords,
  {
    /** What is known of each asset of the workspace, oldest first. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly MediaRecord[], DatabaseError>;
    /** Deletes the workspace's assets, in the caller's transaction if any. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** Deletes the workspace's files from the store, uploads included. */
    readonly removeWorkspaceFiles: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, MediaStorageFailed>;
  }
>()("peal-server/media/application/MediaRecords") {}
