import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no such thread of comments. */
export class InboxThreadNotFound extends Schema.TaggedError<InboxThreadNotFound>()(
  "InboxThreadNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no such thread of comments.",
    httpApiStatus: 404,
  }
) {}
