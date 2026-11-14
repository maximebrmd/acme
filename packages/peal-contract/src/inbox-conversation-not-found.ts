import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no such conversation: it may have gone with its channel, or past the time Peal keeps one. */
export class InboxConversationNotFound extends Schema.TaggedError<InboxConversationNotFound>()(
  "InboxConversationNotFound",
  { ...errorEnvelope },
  {
    description:
      "The workspace has no such conversation: it may have gone with its channel, or past the time Peal keeps one.",
    httpApiStatus: 404,
  }
) {}
