import { Schema } from "effect";

/** Some of the media attached are not the workspace's, or not ready. */
export class UnknownMedia extends Schema.TaggedError<UnknownMedia>()(
  "UnknownMedia",
  { mediaIds: Schema.NonEmptyArray(Schema.String) }
) {
  override get message(): string {
    return `No media ${this.mediaIds.join(", ")} to attach in this workspace`;
  }
}
