import { Schema } from "effect";

/** No review link has this token. */
export class ReviewLinkNotFound extends Schema.TaggedError<ReviewLinkNotFound>()(
  "ReviewLinkNotFound",
  {},
  {
    description: "No review link has this token.",
    httpApiStatus: 404,
  }
) {}
