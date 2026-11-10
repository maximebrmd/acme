import { Schema } from "effect";

/** The workspace keeps as many signatures as it may. */
export class TooManySignatures extends Schema.TaggedError<TooManySignatures>()(
  "TooManySignatures",
  { allowed: Schema.Int }
) {
  override get message(): string {
    return `A workspace keeps ${this.allowed} signatures at most`;
  }
}
