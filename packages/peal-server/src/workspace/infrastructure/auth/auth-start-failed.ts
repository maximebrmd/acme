import { Schema } from "effect";

/** Better Auth did not start: its secret or options are invalid. */
export class AuthStartFailed extends Schema.TaggedError<AuthStartFailed>()(
  "AuthStartFailed",
  { cause: Schema.Defect() }
) {}
