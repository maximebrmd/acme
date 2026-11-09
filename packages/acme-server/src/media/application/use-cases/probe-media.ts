import { DateTime, Effect, Schema } from "effect";

import {
  getAsset,
  MediaAssets,
} from "#media/application/ports/media-assets.ts";
import {
  MediaProbe,
  ProbeOutcomeSchema,
} from "#media/application/ports/media-probe.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { CurrentUploadPolicy } from "#media/application/upload-policy.ts";
import { UploadRejected } from "#media/application/upload-rejected.ts";
import { InvalidMediaTransition } from "#media/domain/invalid-media-transition.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import {
  MediaAsset,
  markReady,
  markRejected,
} from "#media/domain/media-asset.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** The uploaded asset to probe. */
export interface ProbeMediaRequest {
  readonly assetId: MediaAssetId;
  readonly workspaceId: WorkspaceId;
}

/** The ready asset, and what the probe found or why it was skipped. */
export const ProbedMediaSchema = Schema.Struct({
  asset: MediaAsset,
  outcome: ProbeOutcomeSchema,
});

export type ProbedMedia = typeof ProbedMediaSchema.Type;

/**
 * Rejects an uploaded asset whose file the probe found in another format
 * than declared. The asset is saved first: if deleting the file then
 * fails, the rejected asset still points at it, and deleting the asset
 * deletes it.
 */
const rejectMismatch = Effect.fn("Media.rejectMismatch")(
  function* rejectMismatch(asset: MediaAsset) {
    const rejected = yield* Effect.fromResult(
      markRejected(asset, "typeMismatch", yield* DateTime.now)
    );

    const saved = yield* MediaAssets.use((assets) =>
      assets.update(rejected, "uploaded")
    );

    if (saved.status._tag !== "rejected") {
      return yield* new InvalidMediaTransition({
        action: "markRejected",
        assetId: asset.id,
        from: saved.status._tag,
      });
    }

    yield* MediaStorage.use((storage) => storage.remove(asset.storageKey));

    return yield* new UploadRejected({
      assetId: asset.id,
      reason: saved.status.reason,
    });
  }
);

/**
 * Probes an uploaded file and marks the asset ready with what the probe
 * found. Without a probe for its kind, the asset is ready with nothing
 * known, and the outcome says the probe was skipped. When another call
 * marked the asset ready first, that version is kept and returned. A file
 * in another format than declared is deleted and the asset rejected.
 */
export const probeMedia = Effect.fn("Media.probeMedia")(function* probeMedia({
  assetId,
  workspaceId,
}: ProbeMediaRequest) {
  const asset = yield* getAsset(workspaceId, assetId);

  if (asset.status._tag !== "uploaded") {
    return yield* new InvalidMediaTransition({
      action: "markReady",
      assetId,
      from: asset.status._tag,
    });
  }

  const policy = yield* CurrentUploadPolicy;
  const storage = yield* MediaStorage;
  const url = yield* storage.publicUrl(asset.storageKey, policy.probeExpiry);

  const outcome = yield* MediaProbe.use((probe) =>
    probe.probe({ contentType: asset.contentType, url })
  ).pipe(Effect.catchTag("MediaTypeMismatch", () => rejectMismatch(asset)));

  const metadata =
    outcome._tag === "probed" ? outcome.metadata : MediaMetadata.unknown;

  const ready = yield* Effect.fromResult(
    markReady(asset, metadata, yield* DateTime.now)
  );

  const saved = yield* MediaAssets.use((assets) =>
    assets.update(ready, "uploaded")
  );

  if (saved.status._tag !== "ready") {
    return yield* new InvalidMediaTransition({
      action: "markReady",
      assetId,
      from: saved.status._tag,
    });
  }

  const probed: ProbedMedia = { asset: saved, outcome };

  return probed;
});
