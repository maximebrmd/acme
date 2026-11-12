import { Schema } from "effect";

import { RecyclingEndReasonSchema } from "./recycling-end-reason.ts";
import { RecyclingRuleIdSchema } from "./recycling-rule-id.ts";

/**
 * The rule ended (`reason`): it changes no more, and is resumed only after
 * a reason a member can put right.
 */
export class RecyclingRuleEnded extends Schema.TaggedError<RecyclingRuleEnded>()(
  "RecyclingRuleEnded",
  { reason: RecyclingEndReasonSchema, ruleId: RecyclingRuleIdSchema }
) {
  override get message(): string {
    return `Recycling rule ${this.ruleId} ended (${this.reason})`;
  }
}
