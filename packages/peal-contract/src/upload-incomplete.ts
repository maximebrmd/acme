import { Schema } from "effect";

/**
 * The file, or one of its parts, has not reached the store yet. The media
 * stays pending: send what is missing, then complete it again.
 */
export class UploadIncomplete extends Schema.TaggedError<UploadIncomplete>()(
  "UploadIncomplete",
  {},
  {
    description:
      "The file, or one of its parts, has not reached the store yet. Send what is missing, then complete the upload again.",
    httpApiStatus: 409,
  }
) {}
