import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** No review link has this token. */
export class ReviewLinkNotFound extends Schema.TaggedError<ReviewLinkNotFound>()(
  "ReviewLinkNotFound",
  { ...errorEnvelope },
  {
    description: "No review link has this token.",
    httpApiStatus: 404,
  }
) {}
