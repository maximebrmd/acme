import { Schema } from "effect";

/**
 * The token was encrypted with a key the keyring no longer lists, as when an
 * old key is removed before every token encrypted with it was re-encrypted.
 */
export class UnknownTokenKey extends Schema.TaggedError<UnknownTokenKey>()(
  "UnknownTokenKey",
  { keyId: Schema.String }
) {
  override get message(): string {
    return `No token key has the id ${this.keyId}`;
  }
}
