import { Schema } from "effect";

import { RecyclingRuleIdSchema } from "./recycling-rule-id.ts";

/**
 * Which recycling rule made a post, and its place among the rule's posts:
 * from 2, the rule's source being the first (`./recycling-rule.ts`).
 */
export const PostOccurrenceSchema = Schema.Struct({
  number: Schema.Int.check(Schema.isGreaterThanOrEqualTo(2)),
  ruleId: RecyclingRuleIdSchema,
});

export type PostOccurrence = typeof PostOccurrenceSchema.Type;
