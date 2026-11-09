import { CurrentMember } from "acme-contract";
import { Effect } from "effect";

import { PeopleTools } from "#app/mcp/people-tools.ts";
import { notAllowed, refuse } from "#app/mcp/refusals.ts";
import { actorOf } from "#shared/api/actor.ts";
import { invitationView, memberView } from "#workspace/api/members.ts";
import { WorkspaceMembers } from "#workspace/application/workspace-members.ts";

// MCP tokens act for a user, never an API key, and are bound to a
// workspace the user belongs to; the user left it meanwhile.
const gone = () =>
  refuse(
    "You no longer belong to the workspace this connection acts in. Connect to Acme again and pick another."
  );

/** What the people tools do, through the workspace context's use cases. */
export const PeopleToolsLive = PeopleTools.toLayer(
  Effect.gen(function* peopleTools() {
    const members = yield* WorkspaceMembers;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    return PeopleTools.of({
      invite_member: ({ email, role }) =>
        Effect.gen(function* invite() {
          const sent = yield* members
            .invite(yield* actor, { email, role })
            .pipe(
              Effect.catchTags({
                AlreadyMember: () =>
                  refuse("That address belongs to a member already."),
                AuthUnavailable: Effect.die,
                DirectoryUnavailable: Effect.die,
                InvalidEmailAddress: () =>
                  refuse(`${email} is not an email address.`),
                MissingPermission: notAllowed("invite people"),
                NotAMember: gone,
                PlanLimitReached: ({ allowed }) =>
                  refuse(
                    `The workspace's plan allows ${String(allowed)} members, pending invitations included, and has them all: an owner or admin moves it to a larger plan in the web app.`
                  ),
                RoleNotInvitable: () => refuse("Only owners invite owners."),
                TooManyInvitations: () =>
                  refuse(
                    "The workspace has 100 invitations pending, the most it may: revoke some first."
                  ),
                UserRequired: gone,
              })
            );

          return invitationView(sent);
        }),
      list_invitations: () =>
        Effect.gen(function* invitations() {
          const pending = yield* members.invitations(yield* actor).pipe(
            Effect.catchTags({
              DirectoryUnavailable: Effect.die,
              MissingPermission: notAllowed("see invitations"),
              NotAMember: gone,
              UserRequired: gone,
            })
          );

          return { invitations: pending.map(invitationView) };
        }),
      list_members: () =>
        Effect.gen(function* list() {
          const listed = yield* members.list(yield* actor).pipe(
            Effect.catchTags({
              DirectoryUnavailable: Effect.die,
              UserRequired: gone,
            })
          );

          return { members: listed.map(memberView) };
        }),
      revoke_invitation: ({ invitationId }) =>
        Effect.gen(function* revoke() {
          yield* members.revokeInvitation(yield* actor, invitationId).pipe(
            Effect.catchTags({
              DirectoryUnavailable: Effect.die,
              InvitationNotFound: () =>
                refuse(
                  "The workspace has no pending invitation with this id: it was accepted, declined or revoked."
                ),
              MissingPermission: notAllowed("revoke invitations"),
              UserRequired: gone,
            })
          );

          return { revoked: invitationId };
        }),
    });
  })
);
