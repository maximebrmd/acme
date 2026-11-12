import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace keeps as many going rules as it may. */
export class TooManyRecyclingRules extends Schema.TaggedError<TooManyRecyclingRules>()(
  "TooManyRecyclingRules",
  { ...errorEnvelope, allowed: Schema.Int },
  {
    description:
      "The workspace keeps `allowed` recycling rules active or paused, the most it may: stop one before starting another. Nothing was started.",
    httpApiStatus: 409,
  }
) {}
