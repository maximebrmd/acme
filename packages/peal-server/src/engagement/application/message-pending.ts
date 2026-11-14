import { Schema } from "effect";

import { ConversationIdSchema } from "#engagement/domain/conversation-id.ts";
import { OutgoingMessageIdSchema } from "#engagement/domain/outgoing-message-id.ts";

/** A message to the conversation is on its way, or may have gone out: it is settled before another is written. */
export class MessagePending extends Schema.TaggedError<MessagePending>()(
  "MessagePending",
  {
    conversationId: ConversationIdSchema,
    messageId: OutgoingMessageIdSchema,
  }
) {}
