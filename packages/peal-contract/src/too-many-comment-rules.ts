import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace keeps as many comment rules as it may. */
export class TooManyCommentRules extends Schema.TaggedError<TooManyCommentRules>()(
  "TooManyCommentRules",
  { ...errorEnvelope, allowed: Schema.Int },
  {
    description:
      "The workspace keeps `allowed` comment rules active or paused, the most it may: stop one before starting another. Nothing was started.",
    httpApiStatus: 409,
  }
) {}
