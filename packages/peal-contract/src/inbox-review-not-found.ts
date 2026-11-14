import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no such review: it may have gone from the platform, or past the time Peal keeps one. */
export class InboxReviewNotFound extends Schema.TaggedError<InboxReviewNotFound>()(
  "InboxReviewNotFound",
  { ...errorEnvelope },
  {
    description:
      "The workspace has no such review: it may have gone from the platform, or past the time Peal keeps one.",
    httpApiStatus: 404,
  }
) {}
