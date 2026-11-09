import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * A post of the workspace is going out, so the workspace cannot be erased
 * until it has finished.
 */
export class WorkspaceBusy extends Schema.TaggedError<WorkspaceBusy>()(
  "WorkspaceBusy",
  { workspaceId: WorkspaceIdSchema }
) {}
