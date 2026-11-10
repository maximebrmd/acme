import { Effect } from "effect";
import { CurrentMember } from "peal-contract";

import { PeopleTools } from "#app/mcp/people-tools.ts";
import { notAllowed, planRefusal, refuse } from "#app/mcp/refusals.ts";
import { actorOf } from "#shared/api/actor.ts";
import { invitationView, memberView } from "#workspace/api/members.ts";
import { WorkspaceMembers } from "#workspace/application/workspace-members.ts";

// What only a member does: an API key, a workspace's or a partner's, is
// nobody, and a user's token is bound to a workspace they belonged to,
// which they left meanwhile.
const gone = () =>
  CurrentMember.pipe(
    Effect.flatMap(({ principal }) => {
      if (principal._tag === "partnerKey") {
        return refuse(
          "Only a person signed in to Peal does this, never a partner key: a workspace's members and invitations are theirs to see and change, and a partner's customers' workspaces have none."
        );
      }

      return refuse(
        principal._tag === "apiKey"
          ? "Only a person signed in to Peal does this, never an API key: the workspace's members and invitations are theirs to see and change. Connect with OAuth, as a member, to use this tool."
          : "You no longer belong to the workspace this connection acts in. Connect to Peal again and pick another."
      );
    })
  );

/** What the people tools do, through the workspace context's use cases. */
export const PeopleToolsLive = PeopleTools.toLayer(
  Effect.gen(function* peopleTools() {
    const members = yield* WorkspaceMembers;
    const refusedByPlan = yield* planRefusal;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    return PeopleTools.of({
      invite_member: ({ email, role }) =>
        Effect.gen(function* invite() {
          const inviter = yield* actor;

          const sent = yield* members.invite(inviter, { email, role }).pipe(
            Effect.catchTags({
              AlreadyMember: () =>
                refuse("That address belongs to a member already."),
              AuthUnavailable: Effect.die,
              DirectoryUnavailable: Effect.die,
              InvalidEmailAddress: () =>
                refuse(`${email} is not an email address.`),
              MissingPermission: notAllowed("invite people"),
              NotAMember: gone,
              PlanLimitReached: refusedByPlan(inviter.workspaceId),
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
      list_members: ({ includeEmails }) =>
        Effect.gen(function* list() {
          const listed = yield* members.list(yield* actor).pipe(
            Effect.catchTags({
              DirectoryUnavailable: Effect.die,
              UserRequired: gone,
            })
          );

          return {
            members: listed.map((member) => {
              const { email, ...view } = memberView(member);

              return includeEmails === true ? { ...view, email } : view;
            }),
          };
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
