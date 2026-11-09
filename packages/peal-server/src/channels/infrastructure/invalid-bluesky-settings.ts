import { Schema } from "effect";

/**
 * The Bluesky client cannot run as configured: BLUESKY_CLIENT_KEYS is
 * malformed, or PUBLIC_URL cannot host a confidential client. The reason
 * names entries by position and key id, never by key material.
 */
export class InvalidBlueskySettings extends Schema.TaggedError<InvalidBlueskySettings>()(
  "InvalidBlueskySettings",
  { reason: Schema.String }
) {
  override get message(): string {
    return `The Bluesky client settings are invalid: ${this.reason}`;
  }
}
