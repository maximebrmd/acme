import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * There is no workspace with this id that the caller belongs to. Whether it
 * exists for someone else is not told.
 */
export class WorkspaceNotFound extends Schema.TaggedError<WorkspaceNotFound>()(
  "WorkspaceNotFound",
  { ...errorEnvelope },
  {
    description: "No workspace with this id is open to the caller.",
    httpApiStatus: 404,
  }
) {}
