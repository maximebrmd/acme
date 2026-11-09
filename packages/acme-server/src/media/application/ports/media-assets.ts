import { Context, Effect, Option } from "effect";

import { MediaAssetNotFound } from "#media/application/media-asset-not-found.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import type { MediaAsset } from "#media/domain/media-asset.ts";
import type { MediaStatusName } from "#media/domain/media-status.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

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
    readonly insert: (asset: MediaAsset) => Effect.Effect<void>;
    /**
     * Saves a changed asset if it is still in status `from`, the one the
     * caller read, and returns the asset as stored: `asset`, or the version
     * another call saved first, which wins. Fails if the asset was deleted.
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
>()("acme-server/media/application/MediaAssets") {}

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
