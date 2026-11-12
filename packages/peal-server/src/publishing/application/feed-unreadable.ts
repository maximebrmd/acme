import { Schema } from "effect";

/**
 * An address Peal read and could not take as a feed: no answer, or not
 * one it could use (`unreachable`), what it gave is not RSS, Atom or JSON
 * Feed (`notAFeed`), or it is larger than Peal reads (`tooLarge`).
 */
export class FeedUnreadable extends Schema.TaggedError<FeedUnreadable>()(
  "FeedUnreadable",
  { reason: Schema.Literals(["notAFeed", "tooLarge", "unreachable"]) }
) {
  override get message(): string {
    return `The address could not be read as a feed (${this.reason})`;
  }
}
