import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import type { Invitation } from "#workspace/domain/invitation.ts";
import type { NotAMember } from "#workspace/domain/not-a-member.ts";
import type { Role } from "#workspace/domain/roles.ts";

import type { AlreadyMember } from "./already-member.ts";
import type { AuthUnavailable } from "./auth-unavailable.ts";
import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import type { InvalidEmailAddress } from "./invalid-email-address.ts";
import type { TooManyInvitations } from "./too-many-invitations.ts";

/** A member of a workspace, as the other members see them. */
export interface PersonInWorkspace {
  readonly email: string;
  readonly joinedAt: DateTime.Utc;
  readonly name: string;
  /** Their role, as Better Auth stores it. */
  readonly role: string;
  readonly userId: UserId;
}

/** An invitation to send, for a member in person. */
export interface InvitationRequest {
  readonly email: string;
  readonly inviterId: UserId;
  readonly role: Role;
  readonly workspaceId: WorkspaceId;
}

/**
 * Who belongs to a workspace and who is invited to it, from Better Auth's
 * tables. Invitations go out through Better Auth, which checks them again
 * against the inviter's role, the plan and the members, and emails them.
 */
export class WorkspacePeople extends Context.Service<
  WorkspacePeople,
  {
    /**
     * Sends an invitation, replacing a pending one to the same address.
     * NotAMember when the inviter left the workspace, or it was deleted,
     * meanwhile.
     */
    readonly invite: (
      request: InvitationRequest
    ) => Effect.Effect<
      Invitation,
      | AlreadyMember
      | AuthUnavailable
      | InvalidEmailAddress
      | NotAMember
      | PlanLimitReached
      | TooManyInvitations
    >;
    /** The workspace's members, in the order they joined. */
    readonly members: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly PersonInWorkspace[], DirectoryUnavailable>;
    /** The workspace's pending invitations, oldest first, expired included. */
    readonly pendingInvitations: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly Invitation[], DirectoryUnavailable>;
    /**
     * Removes these users from the workspace's members, and says how many
     * were: the member alone goes, as when Better Auth removes one. What
     * they wrote stays.
     */
    readonly removeMembers: (
      workspaceId: WorkspaceId,
      userIds: readonly UserId[]
    ) => Effect.Effect<number, DirectoryUnavailable>;
    /** Revokes every pending invitation of the workspace: how many. */
    readonly revokeAll: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<number, DirectoryUnavailable>;
    /**
     * Runs `change` alone on the workspace's seats, in one transaction: no
     * invitation, acceptance or other change of its members goes on
     * meanwhile, and what `change` reads is what it then writes over. All
     * of it is kept, or none.
     */
    readonly reseating: <A, E, R>(
      workspaceId: WorkspaceId,
      change: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, DirectoryUnavailable | E, R>;
    /**
     * Revokes a pending invitation of the workspace, and says whether there
     * was one.
     */
    readonly revoke: (
      workspaceId: WorkspaceId,
      invitationId: string
    ) => Effect.Effect<boolean, DirectoryUnavailable>;
  }
>()("peal-server/workspace/application/WorkspacePeople") {}
