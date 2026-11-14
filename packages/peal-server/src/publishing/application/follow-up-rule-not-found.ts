import { Schema } from "effect";

/** The workspace has no follow-up rule with this id. */
export class FollowUpRuleNotFound extends Schema.TaggedError<FollowUpRuleNotFound>()(
  "FollowUpRuleNotFound",
  { ruleId: Schema.String }
) {
  override get message(): string {
    return `No follow-up rule ${this.ruleId} in this workspace`;
  }
}
