import { Schema } from "effect";

/** The declared file is larger than Peal stores for its kind. */
export class MediaTooLarge extends Schema.TaggedError<MediaTooLarge>()(
  "MediaTooLarge",
  {
    byteSize: Schema.Int,
    kind: Schema.Literals(["image", "video", "document"]),
    maxByteSize: Schema.Int,
  },
  {
    description:
      "The file is larger than Peal stores for its kind: 16 MiB for an image, 1 GiB for a video, 100 MiB for a document.",
    httpApiStatus: 422,
  }
) {}
