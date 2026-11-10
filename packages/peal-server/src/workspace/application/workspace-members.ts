import { Context, Effect, Layer, Option, Schema } from "effect";

import type { Actor, Permission } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import type { Invitation } from "#workspace/domain/invitation.ts";
import {
  invitableRoles,
  visibleInvitations,
} from "#workspace/domain/invitation.ts";
import { membersToRemove } from "#workspace/domain/member-removal.ts";
import { MembersNotRemovable } from "#workspace/domain/members-not-removable.ts";
import { NotAMember } from "#workspace/domain/not-a-member.ts";
import { RoleNotInvitable } from "#workspace/domain/role-not-invitable.ts";
import type { Role } from "#workspace/domain/roles.ts";
import { UserRequired } from "#workspace/domain/user-required.ts";

import type { AlreadyMember } from "./already-member.ts";
import type { AuthUnavailable } from "./auth-unavailable.ts";
import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import type { InvalidEmailAddress } from "./invalid-email-address.ts";
import { InvitationNotFound } from "./invitation-not-found.ts";
import { MemberDirectory } from "./member-directory.ts";
import type { TooManyInvitations } from "./too-many-invitations.ts";
import { WorkspacePeople } from "./workspace-people.ts";
import type { PersonInWorkspace } from "./workspace-people.ts";

/** What keeping only some members did. */
export interface SeatsFreed {
  /** The members removed. */
  readonly removed: number;
  /** The pending invitations revoked. */
  readonly revoked: number;
}

const decodeUserId = Schema.decodeUnknownOption(UserIdSchema);

/** Whom to invite, and as what. */
export interface NewInvitation {
  readonly email: string;
  readonly role: Role;
}

// Members' addresses are for people: an API key, which is nobody, reads
// none of them.
const person = (actor: Actor): Effect.Effect<UserId, UserRequired> =>
  actor.subject._tag === "user"
    ? Effect.succeed(actor.subject.userId)
    : Effect.fail(new UserRequired());

// Inviting and revoking outlive an impersonation, as Better Auth's own
// routes, which refuse them to staff impersonating a member, have it.
const changing = (actor: Actor, permission: Permission) =>
  Effect.gen(function* changingPeople() {
    yield* Effect.fromResult(authorize(actor, permission));

    const userId = yield* person(actor);

    if (
      actor.subject._tag === "user" &&
      Option.isSome(actor.subject.impersonatedBy)
    ) {
      return yield* new MissingPermission({ permission });
    }

    return userId;
  });

/**
 * A workspace's members and invitations, as its settings show them: every
 * member sees the members, those who may invite see the invitations and
 * send them, and those who may cancel invitations revoke them.
 */
export class WorkspaceMembers extends Context.Service<
  WorkspaceMembers,
  {
    readonly invitations: (
      actor: Actor
    ) => Effect.Effect<
      readonly Invitation[],
      DirectoryUnavailable | MissingPermission | NotAMember | UserRequired
    >;
    readonly invite: (
      actor: Actor,
      invitation: NewInvitation
    ) => Effect.Effect<
      Invitation,
      | AlreadyMember
      | AuthUnavailable
      | DirectoryUnavailable
      | InvalidEmailAddress
      | MissingPermission
      | NotAMember
      | PlanLimitReached
      | RoleNotInvitable
      | TooManyInvitations
      | UserRequired
    >;
    /**
     * Removes every member but those kept, and revokes every pending
     * invitation: what someone chooses for a workspace that must come back
     * within its plan's members (`membersToRemove`). Needs member:delete
     * and invitation:cancel, and the member in person.
     */
    readonly keepOnly: (
      actor: Actor,
      kept: readonly string[]
    ) => Effect.Effect<
      SeatsFreed,
      | DirectoryUnavailable
      | MembersNotRemovable
      | MissingPermission
      | UserRequired
    >;
    readonly list: (
      actor: Actor
    ) => Effect.Effect<
      readonly PersonInWorkspace[],
      DirectoryUnavailable | UserRequired
    >;
    readonly revokeInvitation: (
      actor: Actor,
      invitationId: string
    ) => Effect.Effect<
      void,
      | DirectoryUnavailable
      | InvitationNotFound
      | MissingPermission
      | UserRequired
    >;
  }
>()("peal-server/workspace/application/WorkspaceMembers") {
  static readonly layer = Layer.effect(
    WorkspaceMembers,
    Effect.gen(function* WorkspaceMembersLive() {
      const people = yield* WorkspacePeople;
      const directory = yield* MemberDirectory;

      // The role the user holds in the actor's workspace, read again: what
      // they may see and give depends on it.
      const roleOf = (actor: Actor, userId: UserId) =>
        directory.membership(userId, actor.workspaceId).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () =>
                Effect.fail(new NotAMember({ workspaceId: actor.workspaceId })),
              onSome: ({ role }) => Effect.succeed(role),
            })
          )
        );

      const list = Effect.fn("WorkspaceMembers.list")(function* list(
        actor: Actor
      ) {
        yield* person(actor);

        return yield* people.members(actor.workspaceId);
      });

      const invitations = Effect.fn("WorkspaceMembers.invitations")(
        function* invitations(actor: Actor) {
          yield* Effect.fromResult(authorize(actor, "invitation:create"));

          const role = yield* roleOf(actor, yield* person(actor));

          return visibleInvitations(
            role,
            yield* people.pendingInvitations(actor.workspaceId)
          );
        }
      );

      const invite = Effect.fn("WorkspaceMembers.invite")(function* invite(
        actor: Actor,
        invitation: NewInvitation
      ) {
        const inviterId = yield* changing(actor, "invitation:create");
        const role = yield* roleOf(actor, inviterId);

        if (!invitableRoles(role).includes(invitation.role)) {
          return yield* new RoleNotInvitable({ role: invitation.role });
        }

        return yield* people.invite({
          email: invitation.email,
          inviterId,
          role: invitation.role,
          workspaceId: actor.workspaceId,
        });
      });

      const revokeInvitation = Effect.fn("WorkspaceMembers.revokeInvitation")(
        function* revokeInvitation(actor: Actor, invitationId: string) {
          yield* changing(actor, "invitation:cancel");

          const revoked = yield* people.revoke(actor.workspaceId, invitationId);

          if (!revoked) {
            yield* new InvitationNotFound({ invitationId });
          }
        }
      );

      const keepOnly = Effect.fn("WorkspaceMembers.keepOnly")(
        function* keepOnly(actor: Actor, kept: readonly string[]) {
          const userId = yield* changing(actor, "member:delete");

          yield* Effect.fromResult(authorize(actor, "invitation:cancel"));

          const staying = kept.map((id) => decodeUserId(id));

          if (staying.some(Option.isNone)) {
            return yield* new MembersNotRemovable({ reason: "unknownMember" });
          }

          // Read, decided and written alone on the workspace's seats: of
          // two members choosing at once, the second finds what the first
          // left, itself gone included, and never removes on top of it.
          return yield* people.reseating(
            actor.workspaceId,
            Effect.gen(function* choosing() {
              const leaving = yield* Effect.fromResult(
                membersToRemove(
                  userId,
                  yield* people.members(actor.workspaceId),
                  staying.flatMap(Option.toArray)
                )
              );

              const freed: SeatsFreed = {
                removed: yield* people.removeMembers(
                  actor.workspaceId,
                  leaving
                ),
                revoked: yield* people.revokeAll(actor.workspaceId),
              };

              return freed;
            })
          );
        }
      );

      return WorkspaceMembers.of({
        invitations,
        invite,
        keepOnly,
        list,
        revokeInvitation,
      });
    })
  );
}
