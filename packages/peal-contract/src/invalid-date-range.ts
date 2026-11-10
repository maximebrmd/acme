import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The range of days ends before it starts, or spans more than 366 days. */
export class InvalidDateRange extends Schema.TaggedError<InvalidDateRange>()(
  "InvalidDateRange",
  { ...errorEnvelope },
  {
    description:
      "The range of days ends before it starts, or spans more than 366 days.",
    httpApiStatus: 400,
  }
) {}
