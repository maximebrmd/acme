import { Schema } from "effect";

/**
 * A Meta app's settings are incomplete or malformed: an id without its
 * secret, or the reverse, or an id that is not one. The reason names the
 * settings, never their values.
 */
export class InvalidMetaSettings extends Schema.TaggedError<InvalidMetaSettings>()(
  "InvalidMetaSettings",
  { reason: Schema.String }
) {
  override get message(): string {
    return `The Meta app settings are invalid: ${this.reason}`;
  }
}
