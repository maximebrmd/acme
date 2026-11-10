import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { PostTargetStatusSchema } from "./post-target-status.ts";

/**
 * The status of the post on that channel does not allow this: only a failed
 * or unconfirmed one is reposted, and only an unconfirmed one confirmed.
 */
export class TargetStatusConflict extends Schema.TaggedError<TargetStatusConflict>()(
  "TargetStatusConflict",
  { ...errorEnvelope, status: PostTargetStatusSchema },
  {
    description:
      "The post's status on that channel does not allow this. `status` is the status it has.",
    httpApiStatus: 409,
  }
) {}
