import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * An API key was used on a workspace other than the one that owns it, or an
 * OAuth token on another than the one it is bound to.
 */
export class WorkspaceMismatch extends Schema.TaggedError<WorkspaceMismatch>()(
  "WorkspaceMismatch",
  { owner: WorkspaceIdSchema, requested: WorkspaceIdSchema }
) {}
