import { Schema } from "effect";

/** The workspace has as many links waiting to be used as it may. */
export class TooManyConnectLinks extends Schema.TaggedError<TooManyConnectLinks>()(
  "TooManyConnectLinks",
  { allowed: Schema.Int }
) {}
