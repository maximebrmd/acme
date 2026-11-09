import { Schema } from "effect";

/**
 * A report's range ends before it starts (`days` below one), spans more
 * than a year, or ends on the last day of the calendar Peal keeps.
 */
export class InvalidReportRange extends Schema.TaggedError<InvalidReportRange>()(
  "InvalidReportRange",
  { days: Schema.Int }
) {}
