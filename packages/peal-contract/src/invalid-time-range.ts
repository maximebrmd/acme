import { Schema } from "effect";

/** The range ends before it starts, or spans more than its list takes. */
export class InvalidTimeRange extends Schema.TaggedError<InvalidTimeRange>()(
  "InvalidTimeRange",
  {},
  {
    description:
      "The range ends before it starts, or spans more than the list takes: 62 days for the posts scheduled in a range.",
    httpApiStatus: 400,
  }
) {}
