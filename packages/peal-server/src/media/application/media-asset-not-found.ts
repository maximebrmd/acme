import { Schema } from "effect";

import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";

/** The workspace has no media asset with this id. */
export class MediaAssetNotFound extends Schema.TaggedError<MediaAssetNotFound>()(
  "MediaAssetNotFound",
  { assetId: MediaAssetIdSchema }
) {
  override get message(): string {
    return `No media asset ${this.assetId} in this workspace`;
  }
}
