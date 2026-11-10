import { Schema } from "effect";

/** The workspace already has a channel set of this name, whatever its case. */
export class ChannelSetNameTaken extends Schema.TaggedError<ChannelSetNameTaken>()(
  "ChannelSetNameTaken",
  { name: Schema.String }
) {
  override get message(): string {
    return `The workspace already has a channel set named ${this.name}`;
  }
}
