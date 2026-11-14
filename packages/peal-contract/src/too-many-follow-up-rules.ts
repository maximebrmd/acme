import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace keeps as many follow-up rules as it may. */
export class TooManyFollowUpRules extends Schema.TaggedError<TooManyFollowUpRules>()(
  "TooManyFollowUpRules",
  { ...errorEnvelope, allowed: Schema.Int },
  {
    description:
      "The workspace keeps `allowed` follow-up rules active or paused, the most it may: stop one before starting another. Nothing was started.",
    httpApiStatus: 409,
  }
) {}
