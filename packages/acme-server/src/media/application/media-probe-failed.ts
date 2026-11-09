import { Schema } from "effect";

import { ProbeFailureReasonSchema } from "#media/domain/media-status.ts";

/**
 * A probe ran and could not read the file. The reason is for clients to
 * show; what the probing program printed goes to the server's log.
 */
export class MediaProbeFailed extends Schema.TaggedError<MediaProbeFailed>()(
  "MediaProbeFailed",
  { reason: ProbeFailureReasonSchema }
) {
  override get message(): string {
    return `The media could not be probed: ${this.reason}`;
  }
}
