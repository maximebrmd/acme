import { Schema } from "effect";

/** The password given to confirm an action is not the account's. */
export class IncorrectPassword extends Schema.TaggedError<IncorrectPassword>()(
  "IncorrectPassword",
  {}
) {}
