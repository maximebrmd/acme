import { Context, Effect, Option } from "effect";
import type { DateTime } from "effect";

import { MediaAssetNotFound } from "#media/application/media-asset-not-found.ts";
import type { AltText } from "#media/domain/alt-text.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import type { MediaAsset } from "#media/domain/media-asset.ts";
import type { MediaStatusName } from "#media/domain/media-status.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A page of a workspace's assets, newest first. */
export interface MediaPageRequest {
  /** The last asset of the page before, if this is not the first. */
  readonly after: Option.Option<MediaAssetId>;
  readonly limit: number;
}

export interface MediaPage {
  readonly assets: readonly MediaAsset[];
  /** Where the next page starts, if there is one. */
  readonly next: Option.Option<MediaAssetId>;
}

/**
 * The media assets of every workspace. Each lookup names the workspace, so
 * an asset is never reached from another workspace.
 */
export class MediaAssets extends Context.Service<
  MediaAssets,
  {
    readonly findById: (
      workspaceId: WorkspaceId,
      assetId: MediaAssetId
    ) => Effect.Effect<Option.Option<MediaAsset>>;
    /** The workspace's assets, newest first, a page at a time. */
    readonly list: (
      workspaceId: WorkspaceId,
      page: MediaPageRequest
    ) => Effect.Effect<MediaPage>;
    readonly insert: (asset: MediaAsset) => Effect.Effect<void>;
    /**
     * Saves the asset's description, whatever its status, and returns the
     * asset as stored.
     */
    readonly describe: (
      workspaceId: WorkspaceId,
      assetId: MediaAssetId,
      altText: Option.Option<AltText>,
      now: DateTime.Utc
    ) => Effect.Effect<MediaAsset, MediaAssetNotFound>;
    /**
     * Saves a changed asset if it is still in status `from`, the one the
     * caller read, and returns the asset as stored: `asset`, or the version
     * another call saved first, which wins. Fails if the asset was deleted.
     * It keeps the stored description, which `describe` changes.
     */
    readonly update: (
      asset: MediaAsset,
      from: MediaStatusName
    ) => Effect.Effect<MediaAsset, MediaAssetNotFound>;
    /** Deletes the asset's record. Succeeds if it is gone. */
    readonly remove: (
      workspaceId: WorkspaceId,
      assetId: MediaAssetId
    ) => Effect.Effect<void>;
  }
>()("peal-server/media/application/MediaAssets") {}

/** The workspace's asset, or `MediaAssetNotFound`. */
export const getAsset = (
  workspaceId: WorkspaceId,
  assetId: MediaAssetId
): Effect.Effect<MediaAsset, MediaAssetNotFound, MediaAssets> =>
  MediaAssets.use((assets) => assets.findById(workspaceId, assetId)).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(new MediaAssetNotFound({ assetId })),
        onSome: Effect.succeed,
      })
    )
  );
