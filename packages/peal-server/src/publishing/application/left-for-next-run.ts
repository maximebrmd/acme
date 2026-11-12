import { Schema } from "effect";

/**
 * A rule's occurrence was not made in this run, and will be in a later
 * one: another run, or a member, holds the rule, or it changed since it
 * was read.
 */
export class LeftForNextRun extends Schema.TaggedError<LeftForNextRun>()(
  "LeftForNextRun",
  { ruleId: Schema.String }
) {
  override get message(): string {
    return `Recycling rule ${this.ruleId} is left for the next run`;
  }
}
