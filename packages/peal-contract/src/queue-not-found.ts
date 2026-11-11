import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no queue with this id or name. */
export class QueueNotFound extends Schema.TaggedError<QueueNotFound>()(
  "QueueNotFound",
  { ...errorEnvelope },
  {
    description:
      "The workspace has no queue with this id, or of this name where a request names one; or, where a post is added to its default queue, the workspace has no default queue.",
    httpApiStatus: 404,
  }
) {}
