import { Context, Effect, Layer } from "effect";

import type { MediaAssetNotFound } from "#media/application/media-asset-not-found.ts";
import type { MediaProbeFailed } from "#media/application/media-probe-failed.ts";
import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import type { MediaAssets } from "#media/application/ports/media-assets.ts";
import type { MediaProbe } from "#media/application/ports/media-probe.ts";
import type { MediaStorage } from "#media/application/ports/media-storage.ts";
import type { UploadIncomplete } from "#media/application/upload-incomplete.ts";
import type { UploadRejected } from "#media/application/upload-rejected.ts";
import { completeUpload } from "#media/application/use-cases/complete-upload.ts";
import type { CompleteUploadRequest } from "#media/application/use-cases/complete-upload.ts";
import { createUpload } from "#media/application/use-cases/create-upload.ts";
import type {
  CreateUploadRequest,
  PreparedUpload,
} from "#media/application/use-cases/create-upload.ts";
import { deleteMedia } from "#media/application/use-cases/delete-media.ts";
import type { DeleteMediaRequest } from "#media/application/use-cases/delete-media.ts";
import { probeMedia } from "#media/application/use-cases/probe-media.ts";
import type {
  ProbedMedia,
  ProbeMediaRequest,
} from "#media/application/use-cases/probe-media.ts";
import type { InvalidMediaTransition } from "#media/domain/invalid-media-transition.ts";
import type { MediaAsset } from "#media/domain/media-asset.ts";
import type { MediaTooLarge } from "#media/domain/media-too-large.ts";
import type { UnsupportedMediaType } from "#media/domain/unsupported-media-type.ts";
import type { Ids } from "#shared/application/ids.ts";

type MediaPorts = Ids | MediaAssets | MediaProbe | MediaStorage;

/**
 * The media context's use cases, with their ports provided: what API
 * handlers and other contexts' adapters call.
 */
export class MediaLibrary extends Context.Service<
  MediaLibrary,
  {
    readonly createUpload: (
      request: CreateUploadRequest
    ) => Effect.Effect<
      PreparedUpload,
      MediaStorageFailed | MediaTooLarge | UnsupportedMediaType
    >;
    readonly completeUpload: (
      request: CompleteUploadRequest
    ) => Effect.Effect<
      MediaAsset,
      | InvalidMediaTransition
      | MediaAssetNotFound
      | MediaStorageFailed
      | UploadIncomplete
      | UploadRejected
    >;
    readonly deleteMedia: (
      request: DeleteMediaRequest
    ) => Effect.Effect<void, MediaAssetNotFound | MediaStorageFailed>;
    readonly probeMedia: (
      request: ProbeMediaRequest
    ) => Effect.Effect<
      ProbedMedia,
      | InvalidMediaTransition
      | MediaAssetNotFound
      | MediaProbeFailed
      | MediaStorageFailed
    >;
  }
>()("acme-server/media/application/MediaLibrary") {
  /** The use cases, running on the ports the layer is given. */
  static readonly layer = Layer.effect(
    MediaLibrary,
    Effect.gen(function* MediaLibraryLive() {
      const ports = yield* Effect.context<MediaPorts>();

      return MediaLibrary.of({
        completeUpload: (request) =>
          completeUpload(request).pipe(Effect.provideContext(ports)),
        createUpload: (request) =>
          createUpload(request).pipe(Effect.provideContext(ports)),
        deleteMedia: (request) =>
          deleteMedia(request).pipe(Effect.provideContext(ports)),
        probeMedia: (request) =>
          probeMedia(request).pipe(Effect.provideContext(ports)),
      });
    })
  );
}
