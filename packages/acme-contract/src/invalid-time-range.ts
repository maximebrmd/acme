import { Schema } from "effect";

/** The range ends before it starts, or spans more than 62 days. */
export class InvalidTimeRange extends Schema.TaggedError<InvalidTimeRange>()(
  "InvalidTimeRange",
  {},
  {
    description: "The range ends before it starts, or spans more than 62 days.",
    httpApiStatus: 400,
  }
) {}
