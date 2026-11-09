import { Schema } from "effect";

import { PlatformSchema } from "#channels/domain/platform.ts";

/**
 * This server cannot connect accounts of the platform: Peal has no sign-in
 * flow for it yet (`notSupported`), or the server lacks the settings it needs
 * (`notConfigured`), such as the token keyring or a platform's client keys.
 */
export class PlatformNotConnectable extends Schema.TaggedError<PlatformNotConnectable>()(
  "PlatformNotConnectable",
  {
    platform: PlatformSchema,
    reason: Schema.Literals(["notSupported", "notConfigured"]),
  }
) {
  override get message(): string {
    return `Accounts of ${this.platform} cannot be connected here (${this.reason})`;
  }
}
