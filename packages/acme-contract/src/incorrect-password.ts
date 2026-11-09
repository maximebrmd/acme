import { Schema } from "effect";

/** The password sent to confirm who is asking is not the account's. */
export class IncorrectPassword extends Schema.TaggedError<IncorrectPassword>()(
  "IncorrectPassword",
  {},
  {
    description: "The password is not the account's.",
    httpApiStatus: 400,
  }
) {}
