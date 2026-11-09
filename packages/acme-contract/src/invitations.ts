import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { AlreadyMember } from "./already-member.ts";
import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { InvitationNotFound } from "./invitation-not-found.ts";
import { PlanLimitReached } from "./plan-limit-reached.ts";
import { RoleSchema } from "./role.ts";
import { TooManyInvitations } from "./too-many-invitations.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** An invitation to join the workspace, still waiting for an answer. */
export const InvitationSchema = Schema.Struct({
  createdAt: Schema.DateTimeUtc,
  // The address it was sent to.
  email: Schema.String,
  // When its link stops working. An invitation past it stays pending
  // until it is sent again or revoked.
  expiresAt: Schema.DateTimeUtc,
  id: Schema.String,
  // The member who sent it.
  inviterId: Schema.String,
  // The role the invitee gets on joining, one of those RoleSchema lists.
  role: Schema.String,
}).annotate({ identifier: "Invitation" });

export type Invitation = typeof InvitationSchema.Type;

// An address, as far as a request can tell: the sign-in service checks it
// further, and the email it sends settles it.
const EmailAddressSchema = Schema.String.check(
  Schema.isMaxLength(254),
  Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/u)
);

/** Whom to invite, and the role they get on joining. */
export const NewInvitationSchema = Schema.Struct({
  email: EmailAddressSchema,
  role: RoleSchema,
}).annotate({ identifier: "NewInvitation" });

export type NewInvitation = typeof NewInvitationSchema.Type;

const workspace = { workspaceId: Schema.String };

/**
 * Who is invited to a workspace. Accepting and declining an invitation go
 * through the sign-in service's organization routes, under /api/auth, as
 * the invitee, from the link the invitation emailed.
 */
export class InvitationsApi extends HttpApiGroup.make("invitations")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: [Forbidden],
      params: workspace,
      success: Schema.Array(InvitationSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the workspace's pending invitations, oldest first, expired ones included. Needs invitation:create, as an invitation's id opens its link, and a member rather than an API key; invitations to the owner role are listed to owners only.",
        summary: "List invitations",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      error: [
        Forbidden,
        AlreadyMember,
        TooManyInvitations,
        PlanLimitReached,
        HttpApiError.BadRequest,
      ],
      params: workspace,
      payload: NewInvitationSchema,
      success: InvitationSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Invites someone to the workspace with a role: Acme emails them a link that works for 7 days, in their language when they have an account, in the inviter's otherwise. A pending invitation to the same address is revoked, and its link stops working. Only owners invite owners. On a server that bills, the members and the other pending invitations must leave room in the workspace's plan (PlanLimitReached). Needs invitation:create, and a member in person: not an API key, nor staff impersonating one.",
        summary: "Invite someone",
      })
    ),
    HttpApiEndpoint.delete("revoke", "/:invitationId", {
      error: [Forbidden, InvitationNotFound],
      params: { ...workspace, invitationId: Schema.String },
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Revokes a pending invitation of the workspace: its link stops working at once. Needs invitation:cancel, and a member in person: not an API key, nor staff impersonating one.",
        summary: "Revoke an invitation",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/invitations") {}
