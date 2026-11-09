import { Schema } from "effect";

/**
 * The platform answered, but did not hand the account over: it refused the
 * code or the app, or its answer was not what its API documents. `reason`
 * says which, for the logs; it never holds a token.
 */
export class AuthorizationFailed extends Schema.TaggedError<AuthorizationFailed>()(
  "AuthorizationFailed",
  { reason: Schema.String }
) {
  override get message(): string {
    return `The platform did not authorize the account: ${this.reason}`;
  }
}
