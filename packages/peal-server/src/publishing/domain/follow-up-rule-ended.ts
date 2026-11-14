import { Schema } from "effect";

import { FollowUpEndReasonSchema } from "./follow-up-end-reason.ts";
import { FollowUpRuleIdSchema } from "./follow-up-rule-id.ts";

/** The rule ended (`reason`): it changes no more. */
export class FollowUpRuleEnded extends Schema.TaggedError<FollowUpRuleEnded>()(
  "FollowUpRuleEnded",
  { reason: FollowUpEndReasonSchema, ruleId: FollowUpRuleIdSchema }
) {
  override get message(): string {
    return `Follow-up rule ${this.ruleId} ended (${this.reason})`;
  }
}
