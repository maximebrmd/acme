import { Schema } from "effect";

/** Some of the tags asked for are not the workspace's. */
export class UnknownTags extends Schema.TaggedError<UnknownTags>()(
  "UnknownTags",
  { tagIds: Schema.NonEmptyArray(Schema.String) }
) {
  override get message(): string {
    return `No tag ${this.tagIds.join(", ")} in this workspace`;
  }
}
