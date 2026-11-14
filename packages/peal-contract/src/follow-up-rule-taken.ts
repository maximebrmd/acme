import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The post or the channel already has a follow-up rule going on. */
export class FollowUpRuleTaken extends Schema.TaggedError<FollowUpRuleTaken>()(
  "FollowUpRuleTaken",
  { ...errorEnvelope, ruleId: Schema.String },
  {
    description:
      "The post, or the channel, already has a follow-up rule that has not ended (`ruleId`): change that one, or stop it first. Nothing was started.",
    httpApiStatus: 409,
  }
) {}
