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
  "post:read",
  "post:create",
  "post:update",
  "post:delete",
  "post:schedule",
  "post:approve",
  "post:publish",
]).annotate({ description: "One action on one resource of a workspace." });

export type Permission = typeof PermissionSchema.Type;
