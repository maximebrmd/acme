import { Schema } from "effect";

import {
  PermissionSchema,
  permissionsOf,
  statements,
} from "#shared/domain/access.ts";
import type { Grant, Permission } from "#shared/domain/access.ts";

/**
 * A member's role in a workspace, from most to least trusted:
 *
 * - `owner`: everything, including deleting the workspace. Whoever creates a
 *   workspace owns it.
 * - `admin`: everything but deleting the workspace.
 * - `editor`: writes, schedules, approves and publishes posts, manages media,
 *   asks the writing assistant, and reads channels and analytics.
 * - `contributor`: drafts posts, uploads media and asks the writing
 *   assistant, but publishes nothing.
 * - `viewer`: reads posts, media, channels and analytics.
 */
export const RoleSchema = Schema.Literals([
  "owner",
  "admin",
  "editor",
  "contributor",
  "viewer",
]);

export type Role = typeof RoleSchema.Type;

const { organization, ...allButOrganization } = statements;

export const roleGrants: Readonly<Record<Role, Grant>> = {
  admin: { ...allButOrganization, organization: ["update"] },
  contributor: {
    analytics: ["read"],
    assistant: ["use"],
    channel: ["read"],
    media: ["read", "upload"],
    post: ["read", "create", "update"],
  },
  editor: {
    analytics: ["read"],
    assistant: ["use"],
    channel: ["read"],
    media: ["read", "upload", "delete"],
    post: statements.post,
  },
  owner: { ...allButOrganization, organization },
  viewer: {
    analytics: ["read"],
    channel: ["read"],
    media: ["read"],
    post: ["read"],
  },
};

/**
 * The roles a stored role names. Better Auth keeps a member's roles in one
 * column, separated by commas; names Acme does not know grant nothing.
 */
export const rolesOf = (stored: string): readonly Role[] => {
  const names = new Set(stored.split(",").map((name) => name.trim()));

  return RoleSchema.literals.filter((role) => names.has(role));
};

/** Everything the roles a member holds allow, in vocabulary order. */
export const permissionsFor = (stored: string): readonly Permission[] => {
  const granted = new Set(
    rolesOf(stored).flatMap((role) => permissionsOf(roleGrants[role]))
  );

  return PermissionSchema.literals.filter((permission) =>
    granted.has(permission)
  );
};
