import { Schema } from "effect";

/** Too many comments or decisions came from this address, or through this link, lately: try again later. */
export class TooManyReviewRequests extends Schema.TaggedError<TooManyReviewRequests>()(
  "TooManyReviewRequests",
  {},
  {
    description:
      "Too many comments or decisions came from this address, or through this link, lately: try again later.",
    httpApiStatus: 429,
  }
) {}
