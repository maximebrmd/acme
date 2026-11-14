import { Schema } from "effect";

/**
 * Why a comment rule ended: a member stopped it (`stopped`), or whoever
 * started it can no longer answer comments (`starterGone`). Stored: add a
 * member, never rename or remove one.
 */
export const CommentRuleEndReasonSchema = Schema.Literals([
  "stopped",
  "starterGone",
]);

export type CommentRuleEndReason = typeof CommentRuleEndReasonSchema.Type;
