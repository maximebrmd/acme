import { Schema } from "effect";

/**
 * The workspace has no queue with this id, or no default queue when a
 * post is added to the default.
 */
export class QueueNotFound extends Schema.TaggedError<QueueNotFound>()(
  "QueueNotFound",
  { queue: Schema.String }
) {
  override get message(): string {
    return `No queue ${this.queue} in this workspace`;
  }
}
