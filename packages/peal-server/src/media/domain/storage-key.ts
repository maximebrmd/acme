import { Option, Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { MediaAssetIdSchema } from "./media-asset-id.ts";
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

const extensions: ReadonlySet<string> = new Set(
  Object.values(mediaFormats).map(({ extension }) => extension)
);

const isWorkspaceId = Schema.is(WorkspaceIdSchema);

const isAssetId = Schema.is(MediaAssetIdSchema);

/**
 * The key, relative to the store's prefix, if it is one `storageKeyFor`
 * writes: `media/`, a workspace id, an asset id and the extension of a
 * format Peal takes, nothing more. Whatever else the store holds, under
 * `media/` or not, is none: a sweep of the store never reaches it.
 */
export const mediaKeyOf = (key: string): Option.Option<StorageKey> => {
  const [folder, workspaceId, file, ...rest] = key.split("/");
  const dot = file?.lastIndexOf(".") ?? -1;

  if (
    folder !== "media" ||
    rest.length > 0 ||
    file === undefined ||
    !isWorkspaceId(workspaceId) ||
    !isAssetId(file.slice(0, dot)) ||
    !extensions.has(file.slice(dot + 1))
  ) {
    return Option.none();
  }

  return Option.some(StorageKeySchema.make(key));
};
