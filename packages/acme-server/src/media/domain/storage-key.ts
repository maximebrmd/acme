import { Schema } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { MediaAssetId } from "./media-asset-id.ts";
import { mediaFormats } from "./media-format.ts";
import type { MediaContentType } from "./media-format.ts";

/**
 * Where a file lives in the media store, relative to the store's own prefix.
 * Keys never change, so a stored object can be cached forever.
 */
export const StorageKeySchema = Schema.NonEmptyString.pipe(
  Schema.brand("StorageKey")
);

export type StorageKey = typeof StorageKeySchema.Type;

/**
 * `media/<workspace id>/<asset id>.<extension>`: one folder per workspace, so
 * a workspace's files can be listed or removed together, and the extension
 * that fetchers which ignore Content-Type look for.
 */
export const storageKeyFor = (
  workspaceId: WorkspaceId,
  assetId: MediaAssetId,
  contentType: MediaContentType
): StorageKey =>
  StorageKeySchema.make(
    `media/${workspaceId}/${assetId}.${mediaFormats[contentType].extension}`
  );
