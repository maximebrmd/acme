import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * The workspace's owners require two-step verification, and the account
 * does not have it on: the person is refused the workspace until they turn
 * it on, through every way they reach it (a session, the command line, an
 * MCP client). It is not their removal: what they started there waits,
 * and works again once it is on. An owner is refused requiring it while
 * their own account does not have it on.
 */
export class TwoStepRequired extends Schema.TaggedError<TwoStepRequired>()(
  "TwoStepRequired",
  { workspaceId: WorkspaceIdSchema }
) {}
