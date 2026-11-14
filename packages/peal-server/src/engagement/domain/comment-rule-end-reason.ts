import { Schema } from "effect";

/**
 * Why a comment rule ended: a member stopped it (`stopped`), whoever
 * started it can no longer answer comments (`starterGone`), or its
 * channel was disconnected (`channelGone`). Stored: add a member, never
 * rename or remove one.
 */
export const CommentRuleEndReasonSchema = Schema.Literals([
  "stopped",
  "starterGone",
  "channelGone",
]);

export type CommentRuleEndReason = typeof CommentRuleEndReasonSchema.Type;
