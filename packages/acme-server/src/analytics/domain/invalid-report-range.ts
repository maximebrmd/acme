import { Schema } from "effect";

/**
 * A report's range ends before it starts (`days` below one), or spans more
 * than a year.
 */
export class InvalidReportRange extends Schema.TaggedError<InvalidReportRange>()(
  "InvalidReportRange",
  { days: Schema.Int }
) {}
