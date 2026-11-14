import { Schema } from "effect";

/**
 * The post, or the channel, already has a follow-up rule that has not
 * ended (`ruleId`): change that one, or stop it first.
 */
export class FollowUpRuleTaken extends Schema.TaggedError<FollowUpRuleTaken>()(
  "FollowUpRuleTaken",
  { ruleId: Schema.String }
) {
  override get message(): string {
    return `Follow-up rule ${this.ruleId} already acts there`;
  }
}
