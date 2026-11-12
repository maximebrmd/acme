import { Schema } from "effect";

/**
 * The days asked for short links' clicks end before they start, or span
 * more than `maxDays`, both ends included.
 */
export class InvalidClickRange extends Schema.TaggedError<InvalidClickRange>()(
  "InvalidClickRange",
  { maxDays: Schema.Int }
) {}
