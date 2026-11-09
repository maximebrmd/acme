import { Schema } from "effect";

import { RejectionReasonSchema } from "./media-status.ts";

/**
 * The stored file is not the one declared: another size, or another type.
 * Peal deleted it, and the media is rejected.
 */
export class UploadRejected extends Schema.TaggedError<UploadRejected>()(
  "UploadRejected",
  { reason: RejectionReasonSchema },
  {
    description:
      "The stored file does not have the declared size or type. It was deleted, and the media is rejected.",
    httpApiStatus: 422,
  }
) {}
