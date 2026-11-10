import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The boost stands where this cannot be done (`state`): a boost that failed, ended or was stopped does not run again, and only a paused one resumes. */
export class BoostStateConflict extends Schema.TaggedError<BoostStateConflict>()(
  "BoostStateConflict",
  {
    ...errorEnvelope,
    state: Schema.String,
  },
  {
    description:
      "The boost stands where this cannot be done (`state`): a boost that failed, ended or was stopped does not run again, and only a paused one resumes.",
    httpApiStatus: 409,
  }
) {}
