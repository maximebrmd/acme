import { Schema } from "effect";

/** The workspace has as many endpoints as it may. */
export class TooManyEndpoints extends Schema.TaggedError<TooManyEndpoints>()(
  "TooManyEndpoints",
  { allowed: Schema.Int }
) {}
