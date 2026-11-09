import { Schema } from "effect";

/**
 * The text given to the assistant cannot be worked on: there is nothing in
 * it but spaces, or it is longer than the assistant takes.
 */
export class DraftRejected extends Schema.TaggedError<DraftRejected>()(
  "DraftRejected",
  {
    maxLength: Schema.Int,
    reason: Schema.Literals(["empty", "tooLong"]),
  }
) {
  override get message(): string {
    return this.reason === "empty"
      ? "The text is empty"
      : `The text is longer than the ${this.maxLength} characters the assistant takes`;
  }
}
