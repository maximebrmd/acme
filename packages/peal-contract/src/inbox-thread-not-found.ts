import { Schema } from "effect";

/** The workspace has no such thread of comments. */
export class InboxThreadNotFound extends Schema.TaggedError<InboxThreadNotFound>()(
  "InboxThreadNotFound",
  {},
  {
    description: "The workspace has no such thread of comments.",
    httpApiStatus: 404,
  }
) {}
