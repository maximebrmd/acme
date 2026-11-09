import { Context, Effect, Layer, Option, Stream } from "effect";
import type { Duration } from "effect";

import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import type { MediaAsset } from "#media/domain/media-asset.ts";
import { mediaFormats } from "#media/domain/media-format.ts";
import type {
  MediaContentType,
  MediaKind,
} from "#media/domain/media-format.ts";
import type { Dimensions } from "#media/domain/media-metadata.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { MediaNotPublishable } from "./media-not-publishable.ts";

/** A ready image or video, as a platform takes it. */
export interface PlatformMedia {
  readonly assetId: MediaAssetId;
  readonly byteSize: number;
  readonly contentType: MediaContentType;
  /** As displayed, when the probe read them. */
  readonly dimensions: Option.Option<Dimensions>;
  readonly duration: Option.Option<Duration.Duration>;
  /** A name for the file, with the extension of its format. */
  readonly fileName: string;
  readonly kind: MediaKind;
}

const platformMediaOf = (asset: MediaAsset): PlatformMedia => ({
  assetId: asset.id,
  byteSize: asset.byteSize,
  contentType: asset.contentType,
  dimensions: asset.metadata.dimensions,
  duration: asset.metadata.duration,
  fileName: `${asset.id}.${mediaFormats[asset.contentType].extension}`,
  kind: asset.kind,
});

/**
 * Hands the media of a post to the platforms it goes out on: what an asset
 * is, its bytes, or a short-lived URL to fetch it from. Only assets of the
 * post's workspace that are ready, checked and probed, ever leave: anything
 * else is MediaNotPublishable. No permission is checked, as the publishing
 * jobs act for the workspace once the post was scheduled.
 */
export class MediaForPlatforms extends Context.Service<
  MediaForPlatforms,
  {
    readonly describe: (
      workspaceId: WorkspaceId,
      assetId: MediaAssetId
    ) => Effect.Effect<PlatformMedia, MediaNotPublishable>;
    /** The asset's bytes, read from the store as they are consumed. */
    readonly read: (
      workspaceId: WorkspaceId,
      assetId: MediaAssetId
    ) => Stream.Stream<Uint8Array, MediaNotPublishable | MediaStorageFailed>;
    /** A URL anyone can GET the asset from for at least `expiresIn`. */
    readonly publicUrl: (
      workspaceId: WorkspaceId,
      assetId: MediaAssetId,
      expiresIn: Duration.Duration
    ) => Effect.Effect<string, MediaNotPublishable | MediaStorageFailed>;
  }
>()("acme-server/media/application/MediaForPlatforms") {
  static readonly layer = Layer.effect(
    MediaForPlatforms,
    Effect.gen(function* MediaForPlatformsLive() {
      const assets = yield* MediaAssets;
      const storage = yield* MediaStorage;

      const ready = Effect.fn("MediaForPlatforms.ready")(function* ready(
        workspaceId: WorkspaceId,
        assetId: MediaAssetId
      ) {
        const found = yield* assets.findById(workspaceId, assetId);

        if (Option.isNone(found)) {
          return yield* new MediaNotPublishable({
            assetId,
            reason: "notFound",
          });
        }

        if (found.value.status._tag !== "ready") {
          return yield* new MediaNotPublishable({
            assetId,
            reason: "notReady",
          });
        }

        return found.value;
      });

      return MediaForPlatforms.of({
        describe: (workspaceId, assetId) =>
          ready(workspaceId, assetId).pipe(Effect.map(platformMediaOf)),
        publicUrl: (workspaceId, assetId, expiresIn) =>
          ready(workspaceId, assetId).pipe(
            Effect.flatMap((asset) =>
              storage.publicUrl(asset.storageKey, expiresIn)
            )
          ),
        read: (workspaceId, assetId) =>
          Stream.unwrap(
            ready(workspaceId, assetId).pipe(
              Effect.map((asset) => storage.read(asset.storageKey))
            )
          ),
      });
    })
  );
}
