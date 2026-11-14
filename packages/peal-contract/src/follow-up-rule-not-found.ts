import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no follow-up rule with this id. */
export class FollowUpRuleNotFound extends Schema.TaggedError<FollowUpRuleNotFound>()(
  "FollowUpRuleNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no follow-up rule with this id.",
    httpApiStatus: 404,
  }
) {}
