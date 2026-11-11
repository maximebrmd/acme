import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Why a queue has no slot to give: `noSlots`, it has none; `full`, every
 * slot within the horizon is taken.
 */
export const QueueNoRoomSchema = Schema.Literals(["noSlots", "full"]).annotate({
  identifier: "QueueNoRoom",
});

export type QueueNoRoom = typeof QueueNoRoomSchema.Type;

/** The queue has no free slot for the post. */
export class QueueHasNoRoom extends Schema.TaggedError<QueueHasNoRoom>()(
  "QueueHasNoRoom",
  { ...errorEnvelope, queueId: Schema.String, reason: QueueNoRoomSchema },
  {
    description:
      "The queue `queueId` has no slot for the post: it has no slot at all (`noSlots`), or every slot of the year to come is taken (`full`). Add slots to the queue, or choose a time. Nothing was made or moved.",
    httpApiStatus: 409,
  }
) {}
