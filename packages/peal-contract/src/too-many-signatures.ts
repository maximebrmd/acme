import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace keeps as many signatures as it may. */
export class TooManySignatures extends Schema.TaggedError<TooManySignatures>()(
  "TooManySignatures",
  { ...errorEnvelope, allowed: Schema.Int },
  {
    description:
      "The workspace keeps `allowed` signatures, the most it may: delete one before adding another. Nothing was created.",
    httpApiStatus: 409,
  }
) {}
