import { Effect } from "effect";

import {
  getAsset,
  MediaAssets,
} from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { MediaUsage } from "#media/application/ports/media-usage.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** The asset to delete. */
export interface DeleteMediaRequest {
  readonly assetId: MediaAssetId;
  readonly workspaceId: WorkspaceId;
}

/**
 * Deletes the stored file, aborting its upload if it is still pending, then
 * the asset. Posts that may still go out with it refuse the deletion
 * (MediaInUse); drafts that show it lose it first. The file goes before the
 * asset, so a failure leaves the asset to delete again rather than a file
 * nothing points to. It answers with the drafts that lost the asset.
 *
 * A single upload URL that has not expired yet can still create the file
 * again; nothing removes such a file until a sweep of keys without an asset
 * exists.
 */
export const deleteMedia = Effect.fn("Media.deleteMedia")(
  function* deleteMedia({ assetId, workspaceId }: DeleteMediaRequest) {
    const asset = yield* getAsset(workspaceId, assetId);
    const storage = yield* MediaStorage;
    const { status } = asset;

    const detached = yield* MediaUsage.use((usage) =>
      usage.release(workspaceId, assetId)
    );

    if (status._tag === "pending" && status.upload._tag === "multipart") {
      yield* storage.abortMultipartUpload({
        key: asset.storageKey,
        uploadId: status.upload.uploadId,
      });
    }

    yield* storage.remove(asset.storageKey);
    yield* MediaAssets.use((assets) => assets.remove(workspaceId, assetId));

    return detached;
  }
);
