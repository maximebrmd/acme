import { Schema } from "effect";

/**
 * ACME_TOKEN_KEYS is not a keyring. The reason names entries by position and
 * key id, never by key material.
 */
export class InvalidTokenKeyring extends Schema.TaggedError<InvalidTokenKeyring>()(
  "InvalidTokenKeyring",
  { reason: Schema.String }
) {
  override get message(): string {
    return `ACME_TOKEN_KEYS is invalid: ${this.reason}`;
  }
}
