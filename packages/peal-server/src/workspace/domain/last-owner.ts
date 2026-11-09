import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * The account owns, alone, workspaces that other members still use. Closing
 * it would leave them without an owner: another member must own each first,
 * or the workspaces be deleted.
 */
export class LastOwner extends Schema.TaggedError<LastOwner>()("LastOwner", {
  workspaces: Schema.Array(
    Schema.Struct({ id: WorkspaceIdSchema, name: Schema.String })
  ),
}) {}
