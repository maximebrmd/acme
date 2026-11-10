import { Schema } from "effect";

/** The workspace has no such comment under its posts. */
export class InboxCommentNotFound extends Schema.TaggedError<InboxCommentNotFound>()(
  "InboxCommentNotFound",
  {},
  {
    description: "The workspace has no such comment under its posts.",
    httpApiStatus: 404,
  }
) {}
