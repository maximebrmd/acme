import { Schema } from "effect";

/** The message mentions accounts outside the conversation, which a Mastodon direct status would reach too: nothing was sent. */
export class MessageMentionsOutside extends Schema.TaggedError<MessageMentionsOutside>()(
  "MessageMentionsOutside",
  { mentions: Schema.Array(Schema.String) }
) {}
