import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** An address Peal read and could not take as a feed. */
export class FeedUnreadable extends Schema.TaggedError<FeedUnreadable>()(
  "FeedUnreadable",
  {
    ...errorEnvelope,
    // No answer it could use (`unreachable`), something that is not RSS
    // 2.0, Atom 1.0 or JSON Feed 1.1 (`notAFeed`), or a body larger than
    // Peal reads (`tooLarge`).
    reason: Schema.Literals(["notAFeed", "tooLarge", "unreachable"]),
  },
  {
    description:
      "Peal read the address and could not take what it gave as a feed: `reason` says why. Nothing was kept.",
    httpApiStatus: 422,
  }
) {}
