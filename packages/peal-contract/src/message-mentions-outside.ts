import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The message mentions accounts outside the conversation, which a Mastodon direct status would reach too: take the mentions out. Nothing was sent. */
export class MessageMentionsOutside extends Schema.TaggedError<MessageMentionsOutside>()(
  "MessageMentionsOutside",
  {
    ...errorEnvelope,
    // The mentions the conversation does not hold, as written.
    mentions: Schema.Array(Schema.String),
  },
  {
    description:
      "The message mentions accounts outside the conversation, which a Mastodon direct status would reach too: take the mentions out. Nothing was sent.",
    httpApiStatus: 422,
  }
) {}
