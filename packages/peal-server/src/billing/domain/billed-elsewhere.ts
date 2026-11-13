import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * The workspace's billing account is billed on another of its workspaces,
 * where its plan is ordered: nothing is ordered here.
 */
export class BilledElsewhere extends Schema.TaggedError<BilledElsewhere>()(
  "BilledElsewhere",
  { billingWorkspaceId: WorkspaceIdSchema }
) {}
