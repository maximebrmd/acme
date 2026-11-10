import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * An endpoint hears a partner's every workspace only in the partner's home
 * workspace: this workspace has no partner account.
 */
export class PartnerScopeUnavailable extends Schema.TaggedError<PartnerScopeUnavailable>()(
  "PartnerScopeUnavailable",
  { workspaceId: WorkspaceIdSchema }
) {}
