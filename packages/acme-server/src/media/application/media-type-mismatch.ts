import { Schema } from "effect";

import { MediaContentTypeSchema } from "#media/domain/media-format.ts";

/**
 * A probe found the stored file in another format than the declared one,
 * such as an SVG uploaded as a PNG.
 */
export class MediaTypeMismatch extends Schema.TaggedError<MediaTypeMismatch>()(
  "MediaTypeMismatch",
  { declared: MediaContentTypeSchema }
) {
  override get message(): string {
    return `The file is not of the declared type ${this.declared}`;
  }
}
