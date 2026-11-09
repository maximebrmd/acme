import { Schema } from "effect";

/**
 * The model answered in the shape asked for, but with nothing the assistant
 * can offer: an empty text, a text longer than any post, or no hashtag that
 * reads as one.
 */
export class AnswerRejected extends Schema.TaggedError<AnswerRejected>()(
  "AnswerRejected",
  { reason: Schema.Literals(["empty", "tooLong", "noHashtags"]) }
) {
  override get message(): string {
    return `The model's answer was rejected: ${this.reason}`;
  }
}
