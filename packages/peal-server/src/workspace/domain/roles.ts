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
 * - `owner`: everything, including deleting the workspace, reading its
 *   activity log (who changed what, through which application), turning
 *   ad spending on with its monthly ceiling, and requiring two-step
 *   verification of every member. Whoever creates a workspace owns it.
 * - `admin`: everything but deleting the workspace, reading its activity
 *   log, deciding what ads may spend and requiring two-step verification. Owners and admins alone manage
 *   members, API keys, billing, webhooks, ad accounts and the image
 *   provider the workspace brings to the assistant, and spend on ads
 *   within the ceiling an owner set.
 * - `editor`: writes, schedules, approves and publishes posts, manages media,
 *   asks the writing assistant, reads channels, analytics and ads, and
 *   reads and answers the comments under the workspace's posts and its
 *   channels' direct messages.
 * - `contributor`: drafts posts, uploads media and asks the writing
 *   assistant, but publishes nothing: reads comments, and answers none;
 *   never the direct messages.
 * - `viewer`: reads posts, media, channels, analytics and comments; never
 *   the direct messages.
 */
export const RoleSchema = Schema.Literals([
  "owner",
  "admin",
  "editor",
  "contributor",
  "viewer",
]);

export type Role = typeof RoleSchema.Type;

// What owners alone hold: the workspace itself and its access rules, the
// log of what its members, keys and applications changed, which answers to
// them, and the decision that ads may spend, and how much.
const { activity, ads, organization, ...shared } = statements;

export const roleGrants: Readonly<Record<Role, Grant>> = {
  admin: {
    ...shared,
    ads: ["read", "manage", "spend"],
    organization: ["update"],
  },
  contributor: {
    analytics: ["read"],
    assistant: ["use"],
    channel: ["read"],
    engagement: ["read"],
    media: ["read", "upload"],
    post: ["read", "create", "update"],
  },
  editor: {
    ads: ["read"],
    analytics: ["read"],
    assistant: ["use"],
    channel: ["read"],
    engagement: statements.engagement,
    media: ["read", "upload", "delete"],
    post: statements.post,
  },
  owner: { ...shared, activity, ads, organization },
  viewer: {
    analytics: ["read"],
    channel: ["read"],
    engagement: ["read"],
    media: ["read"],
    post: ["read"],
  },
};

/**
 * The roles a stored role names. Better Auth keeps a member's roles in one
 * column, separated by commas; names Peal does not know grant nothing.
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
