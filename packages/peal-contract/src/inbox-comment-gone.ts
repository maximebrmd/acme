import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The comment is no longer on its platform: it can be neither answered nor moderated. */
export class InboxCommentGone extends Schema.TaggedError<InboxCommentGone>()(
  "InboxCommentGone",
  { ...errorEnvelope },
  {
    description:
      "The comment is no longer on its platform: it can be neither answered nor moderated.",
    httpApiStatus: 409,
  }
) {}
