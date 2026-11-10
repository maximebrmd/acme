import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The address sent more error reports than the server takes for now. */
export class TooManyClientErrors extends Schema.TaggedError<TooManyClientErrors>()(
  "TooManyClientErrors",
  { ...errorEnvelope },
  {
    description:
      "The address sent too many error reports in the last minute: the report was dropped.",
    httpApiStatus: 429,
  }
) {}
