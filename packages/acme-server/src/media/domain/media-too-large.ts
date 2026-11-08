import { Schema } from "effect";

import { MediaKindSchema } from "./media-format.ts";

/** A file larger than acme stores for its kind. */
export class MediaTooLarge extends Schema.TaggedError<MediaTooLarge>()(
  "MediaTooLarge",
  {
    byteSize: Schema.Int,
    kind: MediaKindSchema,
    maxByteSize: Schema.Int,
  }
) {
  override get message(): string {
    return `The ${this.kind} has ${this.byteSize} bytes, more than the ${this.maxByteSize} allowed`;
  }
}
