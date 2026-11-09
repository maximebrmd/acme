import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/** The name typed to confirm a workspace's deletion is not its name. */
export class WorkspaceNameMismatch extends Schema.TaggedError<WorkspaceNameMismatch>()(
  "WorkspaceNameMismatch",
  { workspaceId: WorkspaceIdSchema }
) {}
