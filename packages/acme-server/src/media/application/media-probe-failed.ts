import { Schema } from "effect";

/**
 * A probe ran and could not read the file: it is damaged, not the format it
 * claims, or could not be fetched in time.
 */
export class MediaProbeFailed extends Schema.TaggedError<MediaProbeFailed>()(
  "MediaProbeFailed",
  { detail: Schema.String }
) {
  override get message(): string {
    return `The media could not be probed: ${this.detail}`;
  }
}
