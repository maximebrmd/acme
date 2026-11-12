import { Schema } from "effect";

/**
 * `PEAL_INBOX_PLATFORMS` names a platform the inbox cannot read, or one
 * whose app the server lacks. The reason names the settings, never their
 * values.
 */
export class InvalidInboxSettings extends Schema.TaggedError<InvalidInboxSettings>()(
  "InvalidInboxSettings",
  { reason: Schema.String }
) {
  override get message(): string {
    return `The inbox settings are invalid: ${this.reason}`;
  }
}
