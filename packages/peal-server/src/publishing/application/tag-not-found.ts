import { Schema } from "effect";

import { TagIdSchema } from "#publishing/domain/tag-id.ts";

/** The workspace has no tag with this id. */
export class TagNotFound extends Schema.TaggedError<TagNotFound>()(
  "TagNotFound",
  { tagId: TagIdSchema }
) {
  override get message(): string {
    return `No tag ${this.tagId} in this workspace`;
  }
}
