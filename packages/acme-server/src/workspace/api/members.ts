import {
  AlreadyMember,
  Api,
  CurrentMember,
  Forbidden,
  InvitationNotFound,
  PlanLimitReached,
  TooManyInvitations,
} from "acme-contract";
import type {
  Invitation as InvitationView,
  WorkspaceMember as MemberView,
} from "acme-contract";
import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";

import { actorOf } from "#shared/api/actor.ts";
import { WorkspaceMembers } from "#workspace/application/workspace-members.ts";
import type { PersonInWorkspace } from "#workspace/application/workspace-people.ts";
import type { Invitation } from "#workspace/domain/invitation.ts";

/** What clients see of a member. */
export const memberView = (person: PersonInWorkspace): MemberView => ({
  email: person.email,
  joinedAt: person.joinedAt,
  name: person.name,
  role: person.role,
  userId: person.userId,
});

/** What clients see of an invitation. */
export const invitationView = (invitation: Invitation): InvitationView => ({
  createdAt: invitation.createdAt,
  email: invitation.email,
  expiresAt: invitation.expiresAt,
  id: invitation.id,
  inviterId: invitation.inviterId,
  role: invitation.role,
});

const forbidden = () => Effect.fail(new Forbidden());

export const MembersHandlers = HttpApiBuilder.group(
  Api,
  "members",
  Effect.fn(function* membersHandlers(handlers) {
    const members = yield* WorkspaceMembers;

    return handlers.handle("list", () =>
      Effect.gen(function* list() {
        const actor = actorOf(yield* CurrentMember);

        const listed = yield* members.list(actor).pipe(
          Effect.catchTags({
            DirectoryUnavailable: Effect.die,
            UserRequired: forbidden,
          })
        );

        return listed.map(memberView);
      })
    );
  })
);

export const InvitationsHandlers = HttpApiBuilder.group(
  Api,
  "invitations",
  Effect.fn(function* invitationsHandlers(handlers) {
    const members = yield* WorkspaceMembers;

    return handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);

          const sent = yield* members.invite(actor, payload).pipe(
            Effect.catchTags({
              AlreadyMember: () => Effect.fail(new AlreadyMember()),
              AuthUnavailable: Effect.die,
              DirectoryUnavailable: Effect.die,
              InvalidEmailAddress: () =>
                Effect.fail(new HttpApiError.BadRequest()),
              MissingPermission: forbidden,
              // The member left the workspace, or it went, meanwhile.
              NotAMember: forbidden,
              PlanLimitReached: ({ allowed, limit }) =>
                Effect.fail(new PlanLimitReached({ allowed, limit })),
              RoleNotInvitable: forbidden,
              TooManyInvitations: () => Effect.fail(new TooManyInvitations()),
              UserRequired: forbidden,
            })
          );

          return invitationView(sent);
        }),
      list: () =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          const pending = yield* members.invitations(actor).pipe(
            Effect.catchTags({
              DirectoryUnavailable: Effect.die,
              MissingPermission: forbidden,
              NotAMember: forbidden,
              UserRequired: forbidden,
            })
          );

          return pending.map(invitationView);
        }),
      revoke: ({ params }) =>
        Effect.gen(function* revoke() {
          const actor = actorOf(yield* CurrentMember);

          yield* members.revokeInvitation(actor, params.invitationId).pipe(
            Effect.catchTags({
              DirectoryUnavailable: Effect.die,
              InvitationNotFound: () => Effect.fail(new InvitationNotFound()),
              MissingPermission: forbidden,
              UserRequired: forbidden,
            })
          );
        }),
    });
  })
);
