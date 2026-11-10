import { Schema } from "effect";

import { DuplicateSchema } from "./duplicate-window.ts";

/**
 * Another post sends the same content to some of the same channels within
 * `duplicateWindow`, and the request did not say it was meant: one per
 * channel that has it, with the post nearest in time.
 */
export class DuplicateContent extends Schema.TaggedError<DuplicateContent>()(
  "DuplicateContent",
  { duplicates: Schema.NonEmptyArray(DuplicateSchema) }
) {
  override get message(): string {
    return `The same content already goes to ${this.duplicates.length} of these channels`;
  }
}
