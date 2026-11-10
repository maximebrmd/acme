import { Schema } from "effect";

/** The days asked of a report are not a range it covers: `days` of them. */
export class InvalidAdRange extends Schema.TaggedError<InvalidAdRange>()(
  "InvalidAdRange",
  { days: Schema.Int }
) {}
