import { Schema } from "effect";

import { CommentRuleEndReasonSchema } from "./comment-rule-end-reason.ts";

/** The comment rule ended (`reason`), and changes no more. */
export class CommentRuleEnded extends Schema.TaggedError<CommentRuleEnded>()(
  "CommentRuleEnded",
  { reason: CommentRuleEndReasonSchema }
) {}
