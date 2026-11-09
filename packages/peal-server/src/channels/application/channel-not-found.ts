import { Schema } from "effect";

/** The workspace has no channel with this id. */
export class ChannelNotFound extends Schema.TaggedError<ChannelNotFound>()(
  "ChannelNotFound",
  { channelId: Schema.String }
) {
  override get message(): string {
    return `No channel ${this.channelId} in this workspace`;
  }
}
