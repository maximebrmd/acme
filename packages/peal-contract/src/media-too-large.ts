import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { ByteCountSchema } from "./int64.ts";

/** The declared file is larger than Peal stores for its kind. */
export class MediaTooLarge extends Schema.TaggedError<MediaTooLarge>()(
  "MediaTooLarge",
  {
    ...errorEnvelope,
    byteSize: ByteCountSchema,
    kind: Schema.Literals(["image", "video", "document"]),
    maxByteSize: ByteCountSchema,
  },
  {
    description:
      "The file is larger than Peal stores for its kind: 16 MiB for an image, 1 GiB for a video, 100 MiB for a document.",
    httpApiStatus: 422,
  }
) {}
