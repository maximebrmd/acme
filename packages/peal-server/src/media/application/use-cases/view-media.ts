import { Effect, Option } from "effect";

import {
  getAsset,
  MediaAssets,
} from "#media/application/ports/media-assets.ts";
import type { MediaPageRequest } from "#media/application/ports/media-assets.ts";
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

/**
 * A page of the workspace's media to show: of a kind, and holding a text
 * in its name or description, when asked (see `MediaPageRequest`).
 */
export interface ListMediaRequest extends MediaPageRequest {
  readonly workspaceId: WorkspaceId;
}

const hasFile = (asset: MediaAsset): boolean =>
  asset.status._tag === "uploaded" || asset.status._tag === "ready";

/**
 * The asset with a URL its file can be read from, signed for the policy's
 * view expiry: a pending asset has no file yet, and a rejected one had it
 * deleted.
 */
export const itemOf = Effect.fn("Media.itemOf")(function* itemOf(
  asset: MediaAsset
) {
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

/**
 * The workspace's assets, newest first, whatever their status: all of
 * them, or those of a kind and holding a text, when asked.
 */
export const listMedia = Effect.fn("Media.listMedia")(function* listMedia({
  workspaceId,
  ...page
}: ListMediaRequest) {
  const listed = yield* MediaAssets.use((assets) =>
    assets.list(workspaceId, page)
  );

  const shown: MediaItemPage = {
    items: yield* Effect.all(listed.assets.map((asset) => itemOf(asset))),
    next: listed.next,
  };

  return shown;
});
