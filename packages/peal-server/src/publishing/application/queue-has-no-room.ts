import { Schema } from "effect";

import { QueueIdSchema } from "#publishing/domain/queue-id.ts";

/**
 * The queue has no slot for a post: none at all (`noSlots`), or every slot
 * within the horizon is taken (`full`).
 */
export class QueueHasNoRoom extends Schema.TaggedError<QueueHasNoRoom>()(
  "QueueHasNoRoom",
  {
    queueId: QueueIdSchema,
    reason: Schema.Literals(["full", "noSlots"]),
  }
) {
  override get message(): string {
    return this.reason === "noSlots"
      ? `Queue ${this.queueId} has no slot`
      : `Every slot of queue ${this.queueId} is taken`;
  }
}
