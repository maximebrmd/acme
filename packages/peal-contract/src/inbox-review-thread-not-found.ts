import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no such location's reviews. */
export class InboxReviewThreadNotFound extends Schema.TaggedError<InboxReviewThreadNotFound>()(
  "InboxReviewThreadNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no such location's reviews.",
    httpApiStatus: 404,
  }
) {}
