import { Schema } from "effect";

import { PermissionSchema } from "#shared/domain/access.ts";

import { PartnerIdSchema, PartnerKeyIdSchema } from "./partner-id.ts";
import { PartnerScopeSchema } from "./partner-key.ts";

/**
 * A partner key. It belongs to a partner account, not to the person who
 * created it, and acts in the workspaces the partner owns.
 */
export class PartnerKeyPrincipal extends Schema.TaggedClass<PartnerKeyPrincipal>(
  "peal-server/workspace/domain/PartnerKeyPrincipal"
)("PartnerKeyPrincipal", {
  partnerId: PartnerIdSchema,
  partnerKeyId: PartnerKeyIdSchema,
  permissions: Schema.Array(PermissionSchema),
  scopes: Schema.Array(PartnerScopeSchema),
}) {}
