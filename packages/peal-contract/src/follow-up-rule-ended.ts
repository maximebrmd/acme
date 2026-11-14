import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { FollowUpEndReasonSchema } from "./follow-up-rule.ts";

/** The follow-up rule ended: it changes no more. */
export class FollowUpRuleEnded extends Schema.TaggedError<FollowUpRuleEnded>()(
  "FollowUpRuleEnded",
  { ...errorEnvelope, reason: FollowUpEndReasonSchema },
  {
    description:
      "The follow-up rule ended (`reason`) and changes no more: start another one. Nothing was changed.",
    httpApiStatus: 409,
  }
) {}
