import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * A boost of the workspace runs, may run or is being made: the workspace
 * is not erased until it is stopped, so nothing spends that nobody follows.
 */
export class BoostsRunning extends Schema.TaggedError<BoostsRunning>()(
  "BoostsRunning",
  { boosts: Schema.Int, workspaceId: WorkspaceIdSchema }
) {}
