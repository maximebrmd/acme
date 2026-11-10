import { Schema } from "effect";

/** The request's body is larger than the server reads from a review link. */
export class ReviewRequestTooLarge extends Schema.TaggedError<ReviewRequestTooLarge>()(
  "ReviewRequestTooLarge",
  {},
  {
    description:
      "The request's body is larger than the server reads from a review link.",
    httpApiStatus: 413,
  }
) {}
