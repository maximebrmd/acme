import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The request's body is larger than the server reads from a review link. */
export class ReviewRequestTooLarge extends Schema.TaggedError<ReviewRequestTooLarge>()(
  "ReviewRequestTooLarge",
  { ...errorEnvelope },
  {
    description:
      "The request's body is larger than the server reads from a review link.",
    httpApiStatus: 413,
  }
) {}
