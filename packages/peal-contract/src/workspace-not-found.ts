import { Schema } from "effect";

/**
 * There is no workspace with this id that the caller belongs to. Whether it
 * exists for someone else is not told.
 */
export class WorkspaceNotFound extends Schema.TaggedError<WorkspaceNotFound>()(
  "WorkspaceNotFound",
  {},
  {
    description: "No workspace with this id is open to the caller.",
    httpApiStatus: 404,
  }
) {}
