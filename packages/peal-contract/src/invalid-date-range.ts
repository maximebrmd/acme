import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The range of days ends before it starts, or spans more days than the
 * endpoint takes: 366, or 92 for a workspace's usage.
 */
export class InvalidDateRange extends Schema.TaggedError<InvalidDateRange>()(
  "InvalidDateRange",
  { ...errorEnvelope },
  {
    description:
      "The range of days ends before it starts, or spans more days than the endpoint takes: 366, or 92 for a workspace's usage.",
    httpApiStatus: 400,
  }
) {}
