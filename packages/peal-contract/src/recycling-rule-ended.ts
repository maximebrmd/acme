import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The rule ended, and changes no more. */
export class RecyclingRuleEnded extends Schema.TaggedError<RecyclingRuleEnded>()(
  "RecyclingRuleEnded",
  { ...errorEnvelope, reason: Schema.String },
  {
    description:
      "The rule ended (`reason`) and changes no more. Resume it when it ended for a reason that can be put right (`planLimit`, `contentRejected`, `noChannels`, `queueFull`); start a new rule from the post otherwise.",
    httpApiStatus: 409,
  }
) {}
