import { Schema } from "effect";

/** A boost in `from` cannot do `action`. */
export class InvalidBoostTransition extends Schema.TaggedError<InvalidBoostTransition>()(
  "InvalidBoostTransition",
  { action: Schema.String, from: Schema.String }
) {}
