import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The description is longer than Peal keeps. */
export class AltTextTooLong extends Schema.TaggedError<AltTextTooLong>()(
  "AltTextTooLong",
  { ...errorEnvelope, maxLength: Schema.Int },
  {
    description: "The description is longer than Peal keeps.",
    httpApiStatus: 422,
  }
) {}
