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
import { InvalidMediaTransition } from "#media/domain/invalid-media-transition.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import { MediaAsset, markReady } from "#media/domain/media-asset.ts";
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
 * Probes an uploaded file and marks the asset ready with what the probe
 * found. Without a probe for its kind, the asset is ready with nothing
 * known, and the outcome says the probe was skipped. When another call
 * marked the asset ready first, that version is kept and returned.
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
  );

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
