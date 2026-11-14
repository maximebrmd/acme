import { Schema } from "effect";

/** The workspace sent no such message from Peal, or it went with its conversation. */
export class OutgoingMessageNotFound extends Schema.TaggedError<OutgoingMessageNotFound>()(
  "OutgoingMessageNotFound",
  { messageId: Schema.String }
) {}
