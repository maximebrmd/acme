import { Schema } from "effect";

/** The declared file is larger tha Peal stores for its kind. */
export class MediaTooLarge extends Schema.TaggedError<MediaTooLarge>()(
  "MediaTooLarge",
  {
    byteSize: Schema.Int,
    kind: Schema.Literals(["image", "video"]),
    maxByteSize: Schema.Int,
  },
  {
    description:
      "The file is larger tha Peal stores for its kind: 16 MiB for an image, 1 GiB for a video.",
    httpApiStatus: 422,
  }
) {}
