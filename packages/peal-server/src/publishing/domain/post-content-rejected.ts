import { Schema } from "effect";

import { ContentViolationSchema } from "./content-violation.ts";

/** The post's content breaks the rules its channels' platforms set. */
export class PostContentRejected extends Schema.TaggedError<PostContentRejected>()(
  "PostContentRejected",
  { violations: Schema.NonEmptyArray(ContentViolationSchema) }
) {
  override get message(): string {
    const kinds = new Set(this.violations.map((violation) => violation._tag));

    return `The post's content cannot be accepted: ${[...kinds].join(", ")}`;
  }
}
