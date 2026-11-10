import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Deleting a workspace asks for its name, typed again, and the name sent is
 * not the workspace's.
 */
export class WorkspaceNameMismatch extends Schema.TaggedError<WorkspaceNameMismatch>()(
  "WorkspaceNameMismatch",
  { ...errorEnvelope },
  {
    description:
      "The name sent to confirm the deletion is not the workspace's name.",
    httpApiStatus: 400,
  }
) {}
