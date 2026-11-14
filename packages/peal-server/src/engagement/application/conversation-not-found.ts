import { Schema } from "effect";

/** The workspace has no such conversation: it may have gone with its channel, or past the time Peal keeps one. */
export class ConversationNotFound extends Schema.TaggedError<ConversationNotFound>()(
  "ConversationNotFound",
  { conversationId: Schema.String }
) {}
