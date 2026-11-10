import { Schema } from "effect";

/**
 * The lookup does not take this input: a field it has not, a value outside
 * what it allows, or one the platform refused (a cursor it never gave).
 */
export class LookupInputRejected extends Schema.TaggedError<LookupInputRejected>()(
  "LookupInputRejected",
  {}
) {}
