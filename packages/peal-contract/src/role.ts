import { Schema } from "effect";

/**
 * A member's role in a workspace, from most to least trusted: `owner`,
 * `admin`, `editor`, `contributor`, `viewer`. The server's list
 * (src/workspace/domain/roles.ts) is the source; a test keeps them equal.
 */
export const RoleSchema = Schema.Literals([
  "owner",
  "admin",
  "editor",
  "contributor",
  "viewer",
]).annotate({ identifier: "Role" });

export type Role = typeof RoleSchema.Type;
