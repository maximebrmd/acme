import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** Too many comments or decisions came from this address, or through this link, lately: try again later. */
export class TooManyReviewRequests extends Schema.TaggedError<TooManyReviewRequests>()(
  "TooManyReviewRequests",
  { ...errorEnvelope },
  {
    description:
      "Too many comments or decisions came from this address, or through this link, lately: try again later.",
    httpApiStatus: 429,
  }
) {}
