import { Schema } from "effect";

import { OutgoingMessageIdSchema } from "./outgoing-message-id.ts";

/** A message sent from Peal was asked to move on from a state that does not allow it. */
export class InvalidOutgoingMessageTransition extends Schema.TaggedError<InvalidOutgoingMessageTransition>()(
  "InvalidOutgoingMessageTransition",
  {
    from: Schema.Literals(["sending", "sent", "failed", "unconfirmed"]),
    messageId: OutgoingMessageIdSchema,
  }
) {}
