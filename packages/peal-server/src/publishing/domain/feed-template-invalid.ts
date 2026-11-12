import { Schema } from "effect";

/**
 * A feed's template Peal cannot write posts from: it names a placeholder
 * it does not know (`unknownPlaceholder`, with its name), is longer than
 * `maxTemplateLength` (`tooLong`), or says nothing (`empty`).
 */
export class FeedTemplateInvalid extends Schema.TaggedError<FeedTemplateInvalid>()(
  "FeedTemplateInvalid",
  {
    placeholder: Schema.optional(Schema.String),
    reason: Schema.Literals(["empty", "tooLong", "unknownPlaceholder"]),
  }
) {
  override get message(): string {
    return this.reason === "unknownPlaceholder"
      ? `The template names an unknown placeholder: {${this.placeholder ?? ""}}`
      : `The template is ${this.reason === "empty" ? "empty" : "too long"}`;
  }
}
