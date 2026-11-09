import { Schema } from "effect";

/**
 * TikTok's publishing settings are malformed. The reason names the
 * setting, never its value.
 */
export class InvalidTikTokSettings extends Schema.TaggedError<InvalidTikTokSettings>()(
  "InvalidTikTokSettings",
  { reason: Schema.String }
) {
  override get message(): string {
    return `The TikTok settings are invalid: ${this.reason}`;
  }
}
