import { Schema } from "effect";

/** The workspace already has a queue of this name, whatever its case. */
export class QueueNameTaken extends Schema.TaggedError<QueueNameTaken>()(
  "QueueNameTaken",
  { name: Schema.String }
) {
  override get message(): string {
    return `The workspace already has a queue named ${this.name}`;
  }
}
