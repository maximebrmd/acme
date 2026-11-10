import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no such comment under its posts. */
export class InboxCommentNotFound extends Schema.TaggedError<InboxCommentNotFound>()(
  "InboxCommentNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no such comment under its posts.",
    httpApiStatus: 404,
  }
) {}
