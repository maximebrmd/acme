import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no comment rule with this id. */
export class CommentRuleNotFound extends Schema.TaggedError<CommentRuleNotFound>()(
  "CommentRuleNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no comment rule with this id.",
    httpApiStatus: 404,
  }
) {}
