import { Schema } from "effect";

/** A description longer than acme keeps. */
export class AltTextTooLong extends Schema.TaggedError<AltTextTooLong>()(
  "AltTextTooLong",
  { length: Schema.Int, maxLength: Schema.Int }
) {
  override get message(): string {
    return `The description has ${this.length} characters, more than the ${this.maxLength} allowed`;
  }
}
