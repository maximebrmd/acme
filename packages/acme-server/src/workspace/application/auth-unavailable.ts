import { Schema } from "effect";

/** Better Auth failed to answer, as when its database is down. */
export class AuthUnavailable extends Schema.TaggedError<AuthUnavailable>()(
  "AuthUnavailable",
  { cause: Schema.Defect() }
) {}
