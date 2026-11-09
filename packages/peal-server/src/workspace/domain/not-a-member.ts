import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * The user is not a member of the workspace, or it does not exist: the two
 * read the same, so a request cannot learn which workspaces exist.
 */
export class NotAMember extends Schema.TaggedError<NotAMember>()("NotAMember", {
  workspaceId: WorkspaceIdSchema,
}) {}
