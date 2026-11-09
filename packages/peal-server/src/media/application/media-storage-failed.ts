import { Schema } from "effect";

/**
 * The media store could not be reached, or refused a request peal expected
 * it to take: credentials, bucket or network. The operation names the
 * request.
 */
export class MediaStorageFailed extends Schema.TaggedError<MediaStorageFailed>()(
  "MediaStorageFailed",
  { cause: Schema.Defect(), operation: Schema.String }
) {
  override get message(): string {
    return `The media store failed to ${this.operation}`;
  }
}
