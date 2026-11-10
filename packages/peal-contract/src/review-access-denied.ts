import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { ReviewLinkAccessSchema } from "./review-link-access.ts";

/** The review link does not let its holders do this. */
export class ReviewAccessDenied extends Schema.TaggedError<ReviewAccessDenied>()(
  "ReviewAccessDenied",
  {
    ...errorEnvelope,
    needed: ReviewLinkAccessSchema,
  },
  {
    description:
      "The review link does not let its holders do this. `needed` is the access a link must have for it.",
    httpApiStatus: 403,
  }
) {}
