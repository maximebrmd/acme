import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The range ends before it starts, or spans more than 62 days. */
export class InvalidTimeRange extends Schema.TaggedError<InvalidTimeRange>()(
  "InvalidTimeRange",
  { ...errorEnvelope },
  {
    description: "The range ends before it starts, or spans more than 62 days.",
    httpApiStatus: 400,
  }
) {}
