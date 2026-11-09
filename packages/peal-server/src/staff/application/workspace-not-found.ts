import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/** No workspace has this id. */
export class WorkspaceNotFound extends Schema.TaggedError<WorkspaceNotFound>()(
  "WorkspaceNotFound",
  { workspaceId: WorkspaceIdSchema }
) {}
