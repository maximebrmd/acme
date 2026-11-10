import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The post has as many working review links as it may: revoke one first. `limit` is how many. */
export class TooManyReviewLinks extends Schema.TaggedError<TooManyReviewLinks>()(
  "TooManyReviewLinks",
  {
    ...errorEnvelope,
    limit: Schema.Int,
  },
  {
    description:
      "The post has as many working review links as it may: revoke one first. `limit` is how many.",
    httpApiStatus: 409,
  }
) {}
