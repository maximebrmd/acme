import { Effect, Option } from "effect";

import {
  getAsset,
  MediaAssets,
} from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { CurrentUploadPolicy } from "#media/application/upload-policy.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import type { MediaAsset } from "#media/domain/media-asset.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** An asset, and where a client can read its file for a while. */
export interface MediaItem {
  readonly asset: MediaAsset;
  /** None until the file is stored, and once it was deleted. */
  readonly url: Option.Option<string>;
}

/** A page of a workspace's media, newest first. */
export interface MediaItemPage {
  readonly items: readonly MediaItem[];
  /** Where the next page starts, if there is one. */
  readonly next: Option.Option<MediaAssetId>;
}

/** The asset to show. */
export interface GetMediaRequest {
  readonly assetId: MediaAssetId;
  readonly workspaceId: WorkspaceId;
}

/** A page of the workspace's media to show. */
export interface ListMediaRequest {
  readonly after: Option.Option<MediaAssetId>;
  readonly limit: number;
  readonly workspaceId: WorkspaceId;
}

const hasFile = (asset: MediaAsset): boolean =>
  asset.status._tag === "uploaded" || asset.status._tag === "ready";

/**
 * The asset with a URL its file can be read from, signed for the policy's
 * view expiry: a pending asset has no file yet, and a rejected one had it
 * deleted.
 */
const itemOf = Effect.fn("Media.itemOf")(function* itemOf(asset: MediaAsset) {
  if (!hasFile(asset)) {
    const item: MediaItem = { asset, url: Option.none() };

    return item;
  }

  const policy = yield* CurrentUploadPolicy;

  const url = yield* MediaStorage.use((storage) =>
    storage.publicUrl(asset.storageKey, policy.viewExpiry)
  );

  const item: MediaItem = { asset, url: Option.some(url) };

  return item;
});

/** One of the workspace's assets. */
export const getMedia = Effect.fn("Media.getMedia")(function* getMedia({
  assetId,
  workspaceId,
}: GetMediaRequest) {
  return yield* itemOf(yield* getAsset(workspaceId, assetId));
});

/** The workspace's assets, newest first, whatever their status. */
export const listMedia = Effect.fn("Media.listMedia")(function* listMedia({
  after,
  limit,
  workspaceId,
}: ListMediaRequest) {
  const page = yield* MediaAssets.use((assets) =>
    assets.list(workspaceId, { after, limit })
  );

  const listed: MediaItemPage = {
    items: yield* Effect.all(page.assets.map((asset) => itemOf(asset))),
    next: page.next,
  };

  return listed;
});
