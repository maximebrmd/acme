import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The declared content type is not one Peal stores. */
export class UnsupportedMediaType extends Schema.TaggedError<UnsupportedMediaType>()(
  "UnsupportedMediaType",
  { ...errorEnvelope, contentType: Schema.String },
  {
    description:
      "Peal does not store files of this content type. It takes JPEG, PNG, GIF and WebP images, and MP4 and QuickTime videos.",
    httpApiStatus: 422,
  }
) {}
