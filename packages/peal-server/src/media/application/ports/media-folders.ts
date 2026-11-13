import { Context } from "effect";
import type { Effect } from "effect";

import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** What removing a folder deleted. */
export interface RemovedFolder {
  /** The bytes of the files deleted. */
  readonly bytes: number;
  readonly files: number;
  /** The multipart uploads aborted. */
  readonly uploads: number;
}

/**
 * The media store's folders, one per workspace (`media/<workspace id>/`), as
 * a whole: what goes when a workspace does.
 */
export class MediaFolders extends Context.Service<
  MediaFolders,
  {
    /**
     * Deletes every file in the workspace's folder and drops its multipart
     * uploads in progress, and says how many. Succeeds once the folder is
     * empty, and when it was already.
     */
    readonly removeWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<RemovedFolder, MediaStorageFailed>;
  }
>()("peal-server/media/application/MediaFolders") {}
