import { Context, Effect, Option } from "effect";
import type { DateTime } from "effect";

import { MediaAssetNotFound } from "#media/application/media-asset-not-found.ts";
import type { AltText } from "#media/domain/alt-text.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import type { MediaAsset } from "#media/domain/media-asset.ts";
import type { MediaStatusName } from "#media/domain/media-status.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

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
     * Inserts the asset if its bytes fit the workspace's storage allowance
     * with what it stores (`storedBytes`), under the workspace's lock, so
     * uploads started together never pass it: PlanLimitReached otherwise.
     */
    readonly insertWithin: (
      asset: MediaAsset,
      allowance: Allowance,
      pendingSince: DateTime.Utc
    ) => Effect.Effect<void, PlanLimitReached>;
    /**
     * The bytes the workspace stores: its uploaded and ready files, and the
     * uploads started after `pendingSince`, which may still arrive.
     * Rejected files are gone from the store, and count for nothing.
     */
    readonly storedBytes: (
      workspaceId: WorkspaceId,
      pendingSince: DateTime.Utc
    ) => Effect.Effect<number>;
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
    /**
     * Saves an asset whose file arrived after the room held for it lapsed
     * (it was started before `pendingSince`, so `storedBytes` no longer
     * counts it), if it is still pending and its bytes fit the allowance
     * with what the workspace stores, under the workspace's lock:
     * PlanLimitReached otherwise. Answers as `update` does.
     */
    readonly updateWithin: (
      asset: MediaAsset,
      allowance: Allowance,
      pendingSince: DateTime.Utc
    ) => Effect.Effect<MediaAsset, MediaAssetNotFound | PlanLimitReached>;
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
