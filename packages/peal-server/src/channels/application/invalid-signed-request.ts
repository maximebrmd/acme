import { Schema } from "effect";

/**
 * A data deletion request that Meta did not sign, or that cannot be read:
 * its signature does not match the app secret, or it is malformed. Nothing
 * was deleted.
 */
export class InvalidSignedRequest extends Schema.TaggedError<InvalidSignedRequest>()(
  "InvalidSignedRequest",
  { reason: Schema.String }
) {
  override get message(): string {
    return `The signed request was refused: ${this.reason}`;
  }
}
