import { Schema } from "effect";

import { PlatformSchema } from "#channels/domain/platform.ts";

/**
 * The workspace already has a channel for this account: an account is
 * connected once per workspace, and connecting it again reconnects it.
 */
export class ChannelAlreadyConnected extends Schema.TaggedError<ChannelAlreadyConnected>()(
  "ChannelAlreadyConnected",
  { accountId: Schema.String, platform: PlatformSchema }
) {
  override get message(): string {
    return `The workspace already has the ${this.platform} account ${this.accountId}`;
  }
}
