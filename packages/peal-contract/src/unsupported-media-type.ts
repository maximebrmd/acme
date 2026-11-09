import { Schema } from "effect";

/** The declared content type is not one Acme stores. */
export class UnsupportedMediaType extends Schema.TaggedError<UnsupportedMediaType>()(
  "UnsupportedMediaType",
  { contentType: Schema.String },
  {
    description:
      "Acme does not store files of this content type. It takes JPEG, PNG, GIF and WebP images, and MP4 and QuickTime videos.",
    httpApiStatus: 422,
  }
) {}
