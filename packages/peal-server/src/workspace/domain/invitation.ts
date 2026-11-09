import { Schema } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { RoleSchema, rolesOf } from "./roles.ts";
import type { Role } from "./roles.ts";

/** An invitation to join a workspace, still waiting for an answer. */
export class Invitation extends Schema.Class<Invitation>(
  "acme-server/workspace/domain/Invitation"
)({
  createdAt: Schema.DateTimeUtc,
  email: Schema.String,
  // When its link stops working.
  expiresAt: Schema.DateTimeUtc,
  id: Schema.NonEmptyString,
  inviterId: UserIdSchema,
  // As Better Auth stores it: one role's name.
  role: Schema.String,
  workspaceId: WorkspaceIdSchema,
}) {}

const holdsOwner = (stored: string): boolean =>
  rolesOf(stored).includes("owner");

/**
 * The roles a member holding `stored` may invite people as: every one for an
 * owner, all but owner for anyone else, as Better Auth's organization routes
 * allow.
 */
export const invitableRoles = (stored: string): readonly Role[] =>
  holdsOwner(stored)
    ? RoleSchema.literals
    : RoleSchema.literals.filter((role) => role !== "owner");

/**
 * The invitations a member holding `stored` may see. An invitation's id
 * opens its link, and only owners make owners: invitations to the owner
 * role are for owners' eyes only.
 */
export const visibleInvitations = (
  stored: string,
  invitations: readonly Invitation[]
): readonly Invitation[] =>
  holdsOwner(stored)
    ? invitations
    : invitations.filter((invitation) => !holdsOwner(invitation.role));
