import { Schema } from "effect";

/** The workspace has no signature with this id. */
export class SignatureNotFound extends Schema.TaggedError<SignatureNotFound>()(
  "SignatureNotFound",
  { signature: Schema.String }
) {
  override get message(): string {
    return `No signature ${this.signature} in this workspace`;
  }
}
