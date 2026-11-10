import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The password sent to confirm who is asking is not the account's. */
export class IncorrectPassword extends Schema.TaggedError<IncorrectPassword>()(
  "IncorrectPassword",
  { ...errorEnvelope },
  {
    description: "The password is not the account's.",
    httpApiStatus: 400,
  }
) {}
