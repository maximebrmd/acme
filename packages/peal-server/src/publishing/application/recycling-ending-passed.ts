import { Schema } from "effect";

/**
 * A rule's next occurrence would go out past its ending (its last day, as
 * a queue's slot can fall after it): it is not made, and the rule ends
 * completed.
 */
export class RecyclingEndingPassed extends Schema.TaggedError<RecyclingEndingPassed>()(
  "RecyclingEndingPassed",
  { ruleId: Schema.String }
) {
  override get message(): string {
    return `Recycling rule ${this.ruleId} would go out past its ending`;
  }
}
