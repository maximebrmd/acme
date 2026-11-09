import { Schema } from "effect";

/**
 * Reconnecting a channel signed in to another account than the channel's:
 * the channel keeps its old tokens, and the other account is not connected.
 */
export class ReconnectAccountMismatch extends Schema.TaggedError<ReconnectAccountMismatch>()(
  "ReconnectAccountMismatch",
  { channelId: Schema.String }
) {
  override get message(): string {
    return `Reconnecting channel ${this.channelId} signed in to another account`;
  }
}
