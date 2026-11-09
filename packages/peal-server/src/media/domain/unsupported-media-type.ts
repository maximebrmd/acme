import { Schema } from "effect";

/** A file whose content type peal does not store. */
export class UnsupportedMediaType extends Schema.TaggedError<UnsupportedMediaType>()(
  "UnsupportedMediaType",
  { contentType: Schema.String }
) {
  override get message(): string {
    return `Media of type "${this.contentType}" is not accepted`;
  }
}
