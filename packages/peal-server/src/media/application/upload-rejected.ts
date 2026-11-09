import { Schema } from "effect";

import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { RejectionReasonSchema } from "#media/domain/media-status.ts";

/**
 * The stored file is not the one the client declared. The asset is rejected
 * and the file deleted; the client starts a new upload.
 */
export class UploadRejected extends Schema.TaggedError<UploadRejected>()(
  "UploadRejected",
  { assetId: MediaAssetIdSchema, reason: RejectionReasonSchema }
) {
  override get message(): string {
    return `The upload of media ${this.assetId} was rejected: ${this.reason}`;
  }
}
