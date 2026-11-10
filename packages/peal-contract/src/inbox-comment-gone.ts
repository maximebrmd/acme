import { Schema } from "effect";

/** The comment is no longer on its platform: it can be neither answered nor moderated. */
export class InboxCommentGone extends Schema.TaggedError<InboxCommentGone>()(
  "InboxCommentGone",
  {},
  {
    description:
      "The comment is no longer on its platform: it can be neither answered nor moderated.",
    httpApiStatus: 409,
  }
) {}
