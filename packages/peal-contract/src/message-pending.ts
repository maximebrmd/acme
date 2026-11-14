import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** A message to this conversation is on its way, or may have gone out: settle it before writing another, so the same message never goes twice. */
export class MessagePending extends Schema.TaggedError<MessagePending>()(
  "MessagePending",
  {
    ...errorEnvelope,
    // The message to settle first.
    messageId: Schema.String,
  },
  {
    description:
      "A message to this conversation is on its way, or may have gone out: settle it before writing another, so the same message never goes twice.",
    httpApiStatus: 409,
  }
) {}
