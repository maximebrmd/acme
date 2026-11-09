import { Context, Effect, Layer } from "effect";
import type { Option } from "effect";

import type { MediaAssetNotFound } from "#media/application/media-asset-not-found.ts";
import type { MediaInUse } from "#media/application/media-in-use.ts";
import type { MediaProbeFailed } from "#media/application/media-probe-failed.ts";
import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import type { MediaAssets } from "#media/application/ports/media-assets.ts";
import { getAsset } from "#media/application/ports/media-assets.ts";
import type { MediaProbe } from "#media/application/ports/media-probe.ts";
import type { MediaStorage } from "#media/application/ports/media-storage.ts";
import { MediaUsage } from "#media/application/ports/media-usage.ts";
import type { AssetUse } from "#media/application/ports/media-usage.ts";
import type { StorageAllowance } from "#media/application/ports/storage-allowance.ts";
import type { UploadIncomplete } from "#media/application/upload-incomplete.ts";
import type { UploadRejected } from "#media/application/upload-rejected.ts";
import { completeUpload } from "#media/application/use-cases/complete-upload.ts";
import { createUpload } from "#media/application/use-cases/create-upload.ts";
import type {
  CreateUploadRequest,
  PreparedUpload,
} from "#media/application/use-cases/create-upload.ts";
import { deleteMedia } from "#media/application/use-cases/delete-media.ts";
import { describeMedia } from "#media/application/use-cases/describe-media.ts";
import { finishUpload } from "#media/application/use-cases/finish-upload.ts";
import { probeMedia } from "#media/application/use-cases/probe-media.ts";
import type { ProbedMedia } from "#media/application/use-cases/probe-media.ts";
import {
  getMedia,
  listMedia,
} from "#media/application/use-cases/view-media.ts";
import type {
  MediaItem,
  MediaItemPage,
} from "#media/application/use-cases/view-media.ts";
import type { AltTextTooLong } from "#media/domain/alt-text-too-long.ts";
import type { InvalidMediaTransition } from "#media/domain/invalid-media-transition.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import type { MediaAsset } from "#media/domain/media-asset.ts";
import type { MediaTooLarge } from "#media/domain/media-too-large.ts";
import type { UnsupportedMediaType } from "#media/domain/unsupported-media-type.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { Actor, Permission } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

type MediaPorts =
  | Ids
  | MediaAssets
  | MediaProbe
  | MediaStorage
  | MediaUsage
  | StorageAllowance;

/** A file to upload into the actor's workspace. */
export type NewUpload = Omit<CreateUploadRequest, "workspaceId">;

/** A page of the actor's workspace's media. */
export interface MediaPageQuery {
  /** The last asset of the page before, if this is not the first. */
  readonly after: Option.Option<MediaAssetId>;
  readonly limit: number;
}

// The asset, looked up in the actor's workspace only.
const target = (actor: Actor, assetId: MediaAssetId) => ({
  assetId,
  workspaceId: actor.workspaceId,
});

type CompleteFailure =
  | InvalidMediaTransition
  | MediaAssetNotFound
  | MediaStorageFailed
  | MissingPermission
  | UploadIncomplete
  | UploadRejected;

/**
 * The media context's use cases, for someone acting in a workspace: each
 * checks the actor's permission first, then works in the actor's workspace
 * only. What API handlers call.
 *
 * | Use case                                     | Needs        |
 * | -------------------------------------------- | ------------ |
 * | getMedia, listMedia, mediaUsage              | media:read   |
 * | createUpload, completeUpload, finishUpload,  | media:upload |
 * | probeMedia, describeMedia                    |              |
 * | deleteMedia                                  | media:delete |
 */
export class MediaLibrary extends Context.Service<
  MediaLibrary,
  {
    readonly createUpload: (
      actor: Actor,
      upload: NewUpload
    ) => Effect.Effect<
      PreparedUpload,
      | AltTextTooLong
      | MediaStorageFailed
      | MediaTooLarge
      | MissingPermission
      | PlanLimitReached
      | UnsupportedMediaType
    >;
    /** Checks the stored file, without probing it (see `finishUpload`). */
    readonly completeUpload: (
      actor: Actor,
      assetId: MediaAssetId
    ) => Effect.Effect<MediaAsset, CompleteFailure>;
    /** Completes the upload, then probes the file. */
    readonly finishUpload: (
      actor: Actor,
      assetId: MediaAssetId
    ) => Effect.Effect<MediaItem, CompleteFailure>;
    readonly probeMedia: (
      actor: Actor,
      assetId: MediaAssetId
    ) => Effect.Effect<
      ProbedMedia,
      | InvalidMediaTransition
      | MediaAssetNotFound
      | MediaProbeFailed
      | MediaStorageFailed
      | MissingPermission
      | UploadRejected
    >;
    readonly describeMedia: (
      actor: Actor,
      assetId: MediaAssetId,
      altText: Option.Option<string>
    ) => Effect.Effect<
      MediaItem,
      | AltTextTooLong
      | MediaAssetNotFound
      | MediaStorageFailed
      | MissingPermission
    >;
    readonly getMedia: (
      actor: Actor,
      assetId: MediaAssetId
    ) => Effect.Effect<
      MediaItem,
      MediaAssetNotFound | MediaStorageFailed | MissingPermission
    >;
    readonly listMedia: (
      actor: Actor,
      page: MediaPageQuery
    ) => Effect.Effect<MediaItemPage, MediaStorageFailed | MissingPermission>;
    /** Which posts show the asset: what deleting it would do. */
    readonly mediaUsage: (
      actor: Actor,
      assetId: MediaAssetId
    ) => Effect.Effect<AssetUse, MediaAssetNotFound | MissingPermission>;
    /** Deletes the asset, and answers with the drafts that lost it. */
    readonly deleteMedia: (
      actor: Actor,
      assetId: MediaAssetId
    ) => Effect.Effect<
      readonly PostId[],
      MediaAssetNotFound | MediaInUse | MediaStorageFailed | MissingPermission
    >;
  }
>()("peal-server/media/application/MediaLibrary") {
  /** The use cases, running on the ports the layer is given. */
  static readonly layer = Layer.effect(
    MediaLibrary,
    Effect.gen(function* MediaLibraryLive() {
      const ports = yield* Effect.context<MediaPorts>();

      // Runs a use case on the layer's ports once the actor is allowed to.
      const allowed =
        (permission: Permission) =>
        <A, E>(
          actor: Actor,
          useCase: Effect.Effect<A, E, MediaPorts>
        ): Effect.Effect<A, E | MissingPermission> =>
          Effect.fromResult(authorize(actor, permission)).pipe(
            Effect.andThen(useCase),
            Effect.provideContext(ports)
          );

      const reading = allowed("media:read");
      const uploading = allowed("media:upload");
      const deleting = allowed("media:delete");

      return MediaLibrary.of({
        completeUpload: (actor, assetId) =>
          uploading(actor, completeUpload(target(actor, assetId))),
        createUpload: (actor, upload) =>
          uploading(
            actor,
            createUpload({ ...upload, workspaceId: actor.workspaceId })
          ),
        deleteMedia: (actor, assetId) =>
          deleting(actor, deleteMedia(target(actor, assetId))),
        describeMedia: (actor, assetId, altText) =>
          uploading(
            actor,
            describeMedia({ ...target(actor, assetId), altText })
          ),
        finishUpload: (actor, assetId) =>
          uploading(actor, finishUpload(target(actor, assetId))),
        getMedia: (actor, assetId) =>
          reading(actor, getMedia(target(actor, assetId))),
        listMedia: (actor, page) =>
          reading(
            actor,
            listMedia({ ...page, workspaceId: actor.workspaceId })
          ),
        mediaUsage: (actor, assetId) =>
          reading(
            actor,
            getAsset(actor.workspaceId, assetId).pipe(
              Effect.andThen(
                MediaUsage.use((usage) => usage.of(actor.workspaceId, assetId))
              )
            )
          ),
        probeMedia: (actor, assetId) =>
          uploading(actor, probeMedia(target(actor, assetId))),
      });
    })
  );
}
