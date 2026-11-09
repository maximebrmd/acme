import { Context } from "effect";
import type { Effect } from "effect";

import type { MediaInUse } from "#media/application/media-in-use.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

/** The posts that show an asset. */
export interface AssetUse {
  /** Drafts, which lose the asset when it is deleted. */
  readonly drafts: readonly PostId[];
  /** Posts scheduled or publishing, which keep it from being deleted. */
  readonly scheduled: readonly PostId[];
}

/**
 * Where the workspace's posts show its assets, from the publishing context,
 * which deleting an asset asks first.
 */
export class MediaUsage extends Context.Service<
  MediaUsage,
  {
    readonly of: (
      workspaceId: WorkspaceId,
      assetId: MediaAssetId
    ) => Effect.Effect<AssetUse>;
    /**
     * Lets the asset go: drafts stop showing it, and the drafts that did
     * are returned. Posts that may still go out keep it (MediaInUse), and
     * then nothing changes.
     */
    readonly release: (
      workspaceId: WorkspaceId,
      assetId: MediaAssetId
    ) => Effect.Effect<readonly PostId[], MediaInUse>;
  }
>()("peal-server/media/application/MediaUsage") {}
