import { Schema } from "effect";

/**
 * What a member or an API key may do in a workspace, as `resource:action`.
 * The server's permission vocabulary (src/shared/domain/access.ts) is the
 * source; a test keeps the two lists equal.
 */
export const PermissionSchema = Schema.Literals([
  "analytics:read",
  "apiKey:create",
  "apiKey:read",
  "apiKey:update",
  "apiKey:delete",
  "assistant:use",
  "billing:read",
  "billing:manage",
  "channel:read",
  "channel:connect",
  "channel:disconnect",
  "invitation:create",
  "invitation:cancel",
  "media:read",
  "media:upload",
  "media:delete",
  "member:create",
  "member:update",
  "member:delete",
  "organization:update",
  "organization:delete",
  "partner:read",
  "partner:manage",
  "post:read",
  "post:create",
  "post:update",
  "post:delete",
  "post:schedule",
  "post:approve",
  "post:publish",
  "webhook:read",
  "webhook:manage",
]).annotate({
  description: "One action on one resource of a workspace.",
  // One named schema in the OpenAPI document, which every SDK reads as one
  // enum type: written inline in each list, .NET could not decode it.
  identifier: "Permission",
});

export type Permission = typeof PermissionSchema.Type;
