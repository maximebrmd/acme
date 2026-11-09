import { Effect } from "effect";

import {
  getAsset,
  MediaAssets,
} from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** The asset to delete. */
export interface DeleteMediaRequest {
  readonly assetId: MediaAssetId;
  readonly workspaceId: WorkspaceId;
}

/**
 * Deletes the stored file, aborting its upload if it is still pending, then
 * the asset. The file goes first, so a failure leaves the asset to delete
 * again rather than a file nothing points to.
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

    if (status._tag === "pending" && status.upload._tag === "multipart") {
      yield* storage.abortMultipartUpload({
        key: asset.storageKey,
        uploadId: status.upload.uploadId,
      });
    }

    yield* storage.remove(asset.storageKey);
    yield* MediaAssets.use((assets) => assets.remove(workspaceId, assetId));
  }
);
