import { DateTime, Effect, Option } from "effect";

import {
  getAsset,
  MediaAssets,
} from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { UploadIncomplete } from "#media/application/upload-incomplete.ts";
import { UploadRejected } from "#media/application/upload-rejected.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import {
  markRejected,
  markUploaded,
  mismatchOf,
} from "#media/domain/media-asset.ts";
import type { MediaAsset } from "#media/domain/media-asset.ts";
import type { MediaStatus } from "#media/domain/media-status.ts";
import { hasEveryPart } from "#media/domain/upload-plan.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** The asset whose upload the client finished. */
export interface CompleteUploadRequest {
  readonly assetId: MediaAssetId;
  readonly workspaceId: WorkspaceId;
}

type MultipartMethod = Extract<
  Extract<MediaStatus, { readonly _tag: "pending" }>["upload"],
  { readonly _tag: "multipart" }
>;

/**
 * Joins the parts of a multipart upload once the store holds every planned
 * part. The store lists the parts itself, so the client sends no ETags.
 */
const joinParts = Effect.fn("Media.joinParts")(function* joinParts(
  asset: MediaAsset,
  method: MultipartMethod
) {
  const storage = yield* MediaStorage;
  const upload = { key: asset.storageKey, uploadId: method.uploadId };
  const parts = yield* storage.listUploadedParts(upload);

  return hasEveryPart(asset.byteSize, method.partSize, parts)
    ? yield* storage.completeMultipartUpload(upload, parts)
    : yield* new UploadIncomplete({ assetId: asset.id });
});

/**
 * The answer for an asset past pending: the asset once its file was taken,
 * or why the file was refused.
 */
const settled = (
  asset: MediaAsset
): Effect.Effect<MediaAsset, UploadRejected> => {
  const { status } = asset;

  return status._tag === "rejected"
    ? Effect.fail(
        new UploadRejected({ assetId: asset.id, reason: status.reason })
      )
    : Effect.succeed(asset);
};

/**
 * Checks that the declared file reached the store, with the declared size
 * and content type, and marks the asset uploaded. For a multipart upload it
 * joins the parts first.
 *
 * It can be called again, also while another call runs: an asset already
 * uploaded is returned as it is, a rejected one gets the same rejection,
 * and an upload whose parts were joined before the asset was saved is found
 * by its stored file. When two calls overlap, the first to save wins and
 * the other returns its result. A file that does not match is deleted and
 * the asset rejected; a missing one leaves the asset pending.
 */
export const completeUpload = Effect.fn("Media.completeUpload")(
  function* completeUpload({ assetId, workspaceId }: CompleteUploadRequest) {
    const asset = yield* getAsset(workspaceId, assetId);
    const { status } = asset;
    const now = yield* DateTime.now;

    if (status._tag !== "pending") {
      return yield* settled(asset);
    }

    const storage = yield* MediaStorage;
    const assets = yield* MediaAssets;

    if (status.upload._tag === "multipart") {
      // Without the upload, the stored file tells: joined by an earlier call,
      // or never there if the upload was aborted.
      yield* joinParts(asset, status.upload).pipe(
        Effect.catchTag("MultipartUploadNotFound", () => Effect.void)
      );
    }

    const stored = yield* storage.head(asset.storageKey);

    if (Option.isNone(stored)) {
      return yield* new UploadIncomplete({ assetId });
    }

    const mismatch = mismatchOf(asset, stored.value);

    if (Option.isSome(mismatch)) {
      const rejected = yield* Effect.fromResult(
        markRejected(asset, mismatch.value, now)
      );

      // The file goes first: if saving fails, the asset is still pending and
      // completing it again finds no file.
      yield* storage.remove(asset.storageKey);

      return yield* settled(yield* assets.update(rejected, "pending"));
    }

    const uploaded = yield* Effect.fromResult(markUploaded(asset, now));

    return yield* settled(yield* assets.update(uploaded, "pending"));
  }
);
