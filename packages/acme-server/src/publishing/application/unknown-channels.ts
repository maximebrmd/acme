import { Schema } from "effect";

/** Some of the channels asked for are not connected to the workspace. */
export class UnknownChannels extends Schema.TaggedError<UnknownChannels>()(
  "UnknownChannels",
  { channelIds: Schema.NonEmptyArray(Schema.String) }
) {
  override get message(): string {
    return `No channel ${this.channelIds.join(", ")} in this workspace`;
  }
}
