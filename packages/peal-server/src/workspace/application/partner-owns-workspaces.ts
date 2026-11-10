import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * The workspace's partner account still owns workspaces: each is
 * offboarded first, so none is left without anyone to answer for it.
 */
export class PartnerOwnsWorkspaces extends Schema.TaggedError<PartnerOwnsWorkspaces>()(
  "PartnerOwnsWorkspaces",
  { owned: Schema.Int, workspaceId: WorkspaceIdSchema }
) {}
