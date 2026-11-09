import { Schema } from "effect";

import { PlatformSchema } from "#channels/domain/platform.ts";

/**
 * The sign-in went through, but reached no account Acme can post to: a
 * Facebook user who manages no Page, or whose Pages have no Instagram
 * professional account linked to them.
 */
export class NoAccountsToConnect extends Schema.TaggedError<NoAccountsToConnect>()(
  "NoAccountsToConnect",
  { platform: PlatformSchema }
) {
  override get message(): string {
    return `The sign-in reached no ${this.platform} account to connect`;
  }
}
