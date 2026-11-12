import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace follows no feed with this id. */
export class FeedNotFound extends Schema.TaggedError<FeedNotFound>()(
  "FeedNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace follows no feed with this id.",
    httpApiStatus: 404,
  }
) {}
