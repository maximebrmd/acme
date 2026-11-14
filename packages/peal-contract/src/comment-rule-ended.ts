import { Schema } from "effect";

import { CommentRuleEndReasonSchema } from "./comment-rule.ts";
import { errorEnvelope } from "./error-envelope.ts";

/** The comment rule ended: it changes no more. */
export class CommentRuleEnded extends Schema.TaggedError<CommentRuleEnded>()(
  "CommentRuleEnded",
  { ...errorEnvelope, reason: CommentRuleEndReasonSchema },
  {
    description:
      "The comment rule ended (`reason`) and changes no more: start another one. Nothing was changed.",
    httpApiStatus: 409,
  }
) {}
