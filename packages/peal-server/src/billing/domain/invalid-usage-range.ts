import { Schema } from "effect";

/**
 * The days asked for a usage report end before they start, or span more
 * than `maxDays`, both ends included.
 */
export class InvalidUsageRange extends Schema.TaggedError<InvalidUsageRange>()(
  "InvalidUsageRange",
  { maxDays: Schema.Int }
) {}
