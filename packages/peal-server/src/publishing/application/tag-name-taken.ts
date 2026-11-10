import { Schema } from "effect";

/** The workspace already has a tag of this name, whatever its case. */
export class TagNameTaken extends Schema.TaggedError<TagNameTaken>()(
  "TagNameTaken",
  { name: Schema.String }
) {
  override get message(): string {
    return `The workspace already has a tag named ${this.name}`;
  }
}
