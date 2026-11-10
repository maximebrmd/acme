import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * The workspace cannot hold a partner account: it does not exist, or a
 * partner owns it.
 */
export class WorkspaceNotEligible extends Schema.TaggedError<WorkspaceNotEligible>()(
  "WorkspaceNotEligible",
  { workspaceId: WorkspaceIdSchema }
) {}
