import { Schema } from "effect";

import { PermissionSchema } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * An API key. It belongs to one workspace, not to the person who created it,
 * and carries the permissions it was given.
 */
export class ApiKeyPrincipal extends Schema.TaggedClass<ApiKeyPrincipal>(
  "acme-server/workspace/domain/ApiKeyPrincipal"
)("ApiKeyPrincipal", {
  apiKeyId: Schema.NonEmptyString,
  permissions: Schema.Array(PermissionSchema),
  workspaceId: WorkspaceIdSchema,
}) {}
