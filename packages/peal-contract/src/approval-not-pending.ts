import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The post does not wait for an approval: none was asked, or it was already decided, withdrawn or scheduled. */
export class ApprovalNotPending extends Schema.TaggedError<ApprovalNotPending>()(
  "ApprovalNotPending",
  { ...errorEnvelope },
  {
    description:
      "The post does not wait for an approval: none was asked, or it was already decided, withdrawn or scheduled.",
    httpApiStatus: 409,
  }
) {}
