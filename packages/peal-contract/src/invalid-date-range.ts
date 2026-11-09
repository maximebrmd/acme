import { Schema } from "effect";

/** The range of days ends before it starts, or spans more than 366 days. */
export class InvalidDateRange extends Schema.TaggedError<InvalidDateRange>()(
  "InvalidDateRange",
  {},
  {
    description:
      "The range of days ends before it starts, or spans more than 366 days.",
    httpApiStatus: 400,
  }
) {}
