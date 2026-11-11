import { Schema } from "effect";

/** The workspace has no recycling rule with this id. */
export class RecyclingRuleNotFound extends Schema.TaggedError<RecyclingRuleNotFound>()(
  "RecyclingRuleNotFound",
  { ruleId: Schema.String }
) {
  override get message(): string {
    return `No recycling rule ${this.ruleId} in this workspace`;
  }
}
