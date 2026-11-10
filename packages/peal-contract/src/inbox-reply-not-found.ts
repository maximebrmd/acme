import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no such reply. */
export class InboxReplyNotFound extends Schema.TaggedError<InboxReplyNotFound>()(
  "InboxReplyNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no such reply.",
    httpApiStatus: 404,
  }
) {}
