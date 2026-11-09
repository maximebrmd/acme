import { Schema } from "effect";

/** What was given as the account's server is not the address of one. */
export class InvalidInstance extends Schema.TaggedError<InvalidInstance>()(
  "InvalidInstance",
  {}
) {}
