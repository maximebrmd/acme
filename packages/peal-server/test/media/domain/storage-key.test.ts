import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { mediaKeyOf, storageKeyFor } from "#media/domain/storage-key.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

const workspaceId = WorkspaceIdSchema.make(
  "4f6b1c1e-2a8d-4c3b-9f1e-1a2b3c4d5e6f"
);

const assetId = MediaAssetIdSchema.make("019a7b2c-3d4e-7f00-8a1b-2c3d4e5f6a7b");

describe(mediaKeyOf, () => {
  it.each([
    "image/png",
    "image/jpeg",
    "video/mp4",
    "video/quicktime",
    "application/pdf",
  ] as const)("reads the key of a %s it wrote", (contentType) => {
    const key = storageKeyFor(workspaceId, assetId, contentType);

    expect(mediaKeyOf(key)).toStrictEqual(Option.some(key));
  });

  it.each([
    // Another folder of the store: the erasure ledger's.
    `erasures/${assetId}.json`,
    // A folder in the media folder, as another instance's prefix would make.
    `media/media/${workspaceId}/${assetId}.png`,
    `media/${workspaceId}/${assetId}.png/more`,
    `media/${workspaceId}/${assetId}.svg`,
    `media/${workspaceId}/${assetId}`,
    `media/${workspaceId}/`,
    `media/${workspaceId.toUpperCase()}/${assetId}.png`,
    `media/not-a-workspace/${assetId}.png`,
    `media/${workspaceId}/not-an-asset.png`,
    // A UUID that is not a v7 is no asset id.
    `media/${workspaceId}/${workspaceId}.png`,
    `/media/${workspaceId}/${assetId}.png`,
    "",
  ])("refuses %j, which Peal never wrote", (key) => {
    expect(mediaKeyOf(key)).toStrictEqual(Option.none());
  });
});
