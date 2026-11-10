import { Schema } from "effect";

/** The workspace has no channel set with this id or name. */
export class ChannelSetNotFound extends Schema.TaggedError<ChannelSetNotFound>()(
  "ChannelSetNotFound",
  { channelSet: Schema.String }
) {
  override get message(): string {
    return `No channel set ${this.channelSet} in this workspace`;
  }
}
