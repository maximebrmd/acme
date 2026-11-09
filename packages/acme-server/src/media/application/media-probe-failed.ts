import { Schema } from "effect";

/** Why a probe could not read a file. */
export const ProbeFailureReasonSchema = Schema.Literals([
  // The file is damaged, or not in a format the probe reads.
  "unreadable",
  // Reading it took longer than the probe allows.
  "timedOut",
  // The store served more bytes than acme stores for the file's kind.
  "tooLarge",
  // The probing program could not run, or printed nothing it understands.
  "toolFailed",
]);

export type ProbeFailureReason = typeof ProbeFailureReasonSchema.Type;

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
