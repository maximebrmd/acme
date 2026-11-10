import { Schema } from "effect";

/** The boost stands where this cannot be done: `state` says where. */
export class BoostStateConflict extends Schema.TaggedError<BoostStateConflict>()(
  "BoostStateConflict",
  { state: Schema.String }
) {}
