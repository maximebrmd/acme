import { Schema } from "effect";

/** The channel's platform has no lookup of that name. */
export class UnknownLookup extends Schema.TaggedError<UnknownLookup>()(
  "UnknownLookup",
  { name: Schema.String }
) {}
