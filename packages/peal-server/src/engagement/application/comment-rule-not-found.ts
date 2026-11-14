import { Schema } from "effect";

/** The workspace has no comment rule with this id. */
export class CommentRuleNotFound extends Schema.TaggedError<CommentRuleNotFound>()(
  "CommentRuleNotFound",
  { ruleId: Schema.String }
) {
  override get message(): string {
    return `No comment rule ${this.ruleId} in this workspace`;
  }
}
