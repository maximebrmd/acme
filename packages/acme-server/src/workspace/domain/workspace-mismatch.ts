import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/** An API key was used on a workspace other than the one that owns it. */
export class WorkspaceMismatch extends Schema.TaggedError<WorkspaceMismatch>()(
  "WorkspaceMismatch",
  { owner: WorkspaceIdSchema, requested: WorkspaceIdSchema }
) {}
