import { Schema } from "effect";

import { PlatformSchema } from "#channels/domain/platform.ts";

/**
 * A platform's OAuth client is configured by halves: its id without its
 * secret, or the other way round. The reason names the settings, never
 * their values.
 */
export class InvalidPlatformClient extends Schema.TaggedError<InvalidPlatformClient>()(
  "InvalidPlatformClient",
  { platform: PlatformSchema, reason: Schema.String }
) {
  override get message(): string {
    return `The ${this.platform} client settings are invalid: ${this.reason}`;
  }
}
