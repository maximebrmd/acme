import { Schema } from "effect";

import { MultipartUploadIdSchema } from "#media/domain/media-status.ts";

/**
 * The store has no multipart upload with this id: it was completed, aborted,
 * or expired.
 */
export class MultipartUploadNotFound extends Schema.TaggedError<MultipartUploadNotFound>()(
  "MultipartUploadNotFound",
  { uploadId: MultipartUploadIdSchema }
) {}
