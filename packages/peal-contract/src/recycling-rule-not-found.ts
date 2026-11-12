import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no recycling rule with this id. */
export class RecyclingRuleNotFound extends Schema.TaggedError<RecyclingRuleNotFound>()(
  "RecyclingRuleNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no recycling rule with this id.",
    httpApiStatus: 404,
  }
) {}
