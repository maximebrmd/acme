import { Schema } from "effect";

/** The address sent more error reports than the server takes for now. */
export class TooManyClientErrors extends Schema.TaggedError<TooManyClientErrors>()(
  "TooManyClientErrors",
  {},
  {
    description:
      "The address sent too many error reports in the last minute: the report was dropped.",
    httpApiStatus: 429,
  }
) {}
