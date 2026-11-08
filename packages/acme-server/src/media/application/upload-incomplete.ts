import { Schema } from "effect";

import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";

/**
 * The file, or one of its parts, has not reached the store yet. The asset
 * stays pending: the client finishes the upload and completes it again.
 */
export class UploadIncomplete extends Schema.TaggedError<UploadIncomplete>()(
  "UploadIncomplete",
  { assetId: MediaAssetIdSchema }
) {
  override get message(): string {
    return `The upload of media ${this.assetId} is not complete`;
  }
}
