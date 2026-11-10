import { Schema } from "effect";

/** The workspace has no such reply. */
export class InboxReplyNotFound extends Schema.TaggedError<InboxReplyNotFound>()(
  "InboxReplyNotFound",
  {},
  {
    description: "The workspace has no such reply.",
    httpApiStatus: 404,
  }
) {}
