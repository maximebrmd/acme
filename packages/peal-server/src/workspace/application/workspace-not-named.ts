import { Schema } from "effect";

/**
 * A partner key reached the MCP endpoint without saying which of its
 * partner's workspaces it acts in.
 */
export class WorkspaceNotNamed extends Schema.TaggedError<WorkspaceNotNamed>()(
  "WorkspaceNotNamed",
  {}
) {}
