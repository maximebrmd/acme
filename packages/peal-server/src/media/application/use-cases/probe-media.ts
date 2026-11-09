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
  markUnprobed,
} from "#media/domain/media-asset.ts";
import type { ProbeState } from "#media/domain/media-status.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** The uploaded asset to probe. */
export interface ProbeMediaRequest {
  readonly assetId: MediaAssetId;
  readonly workspaceId: WorkspaceId;
}

/**
 * The asset as the probe left it, ready or still uploaded, and what the
 * probe found or why it was skipped.
 */
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
 * Records why an uploaded asset could not be probed. It stays uploaded, and
 * probing it again can still make it ready.
 */
const recordUnprobed = Effect.fn("Media.recordUnprobed")(
  function* recordUnprobed(
    asset: MediaAsset,
    probe: Exclude<ProbeState, "pending">
  ) {
    const unprobed = yield* Effect.fromResult(
      markUnprobed(asset, probe, yield* DateTime.now)
    );

    return yield* MediaAssets.use((assets) =>
      assets.update(unprobed, "uploaded")
    );
  }
);

/**
 * Probes an uploaded file and marks the asset ready with what the probe
 * found. Without a probe for its kind, such as a video on a server without
 * ffprobe, the asset stays uploaded, marked unavailable, and the outcome
 * says the probe was skipped. A probe that fails leaves it uploaded with the
 * reason, and fails. When another call marked the asset ready first, that
 * version is kept and returned. A file in another format than declared is
 * deleted and the asset rejected.
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
  ).pipe(
    Effect.catchTags({
      MediaProbeFailed: (failure) =>
        recordUnprobed(asset, failure.reason).pipe(
          Effect.andThen(Effect.fail(failure))
        ),
      MediaTypeMismatch: () => rejectMismatch(asset),
    })
  );

  if (outcome._tag === "skipped") {
    const unprobed: ProbedMedia = {
      asset: yield* recordUnprobed(asset, "unavailable"),
      outcome,
    };

    return unprobed;
  }

  const ready = yield* Effect.fromResult(
    markReady(asset, outcome.metadata, yield* DateTime.now)
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
