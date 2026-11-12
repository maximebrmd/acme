import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace follows as many feeds as it may. */
export class TooManyFeeds extends Schema.TaggedError<TooManyFeeds>()(
  "TooManyFeeds",
  { ...errorEnvelope, allowed: Schema.Int },
  {
    description:
      "The workspace follows `allowed` feeds, the most it may: delete one before adding another. Nothing was added.",
    httpApiStatus: 409,
  }
) {}
