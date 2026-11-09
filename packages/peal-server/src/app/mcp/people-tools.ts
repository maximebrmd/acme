import {
  CurrentMember,
  InvitationSchema,
  NewInvitationSchema,
  WorkspaceMemberSchema,
} from "peal-contract";
import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";

import { changing, reading } from "#app/mcp/annotations.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";

export const ListMembers = Tool.make("list_members", {
  dependencies: [CurrentMember],
  description:
    "Lists the workspace's members, in the order they joined, with their name, email address and role, as every member sees them in the workspace's settings.",
  failure: ToolRefused,
  success: Schema.Struct({ members: Schema.Array(WorkspaceMemberSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List members");

export const ListInvitations = Tool.make("list_invitations", {
  dependencies: [CurrentMember],
  description:
    "Lists the workspace's pending invitations, oldest first, expired ones included, for members who may invite. Invitations to the owner role are listed to owners only.",
  failure: ToolRefused,
  success: Schema.Struct({ invitations: Schema.Array(InvitationSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List invitations");

export const InviteMember = Tool.make("invite_member", {
  dependencies: [CurrentMember],
  description:
    "Invites someone to the workspace by email, with a role: Peal emails them a link that works for 7 days, which lets them join with that role. A pending invitation to the same address is revoked and replaced, and its link stops working. Only owners invite owners; on a server that bills, the plan must have room for one more member. Invite only someone the user named.",
  failure: ToolRefused,
  parameters: NewInvitationSchema,
  success: InvitationSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: false, openWorld: true })
  )
  .annotate(Tool.Title, "Invite someone");

export const RevokeInvitation = Tool.make("revoke_invitation", {
  dependencies: [CurrentMember],
  description:
    "Revokes a pending invitation of the workspace: its link stops working at once, and the invitee can no longer join with it.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    invitationId: Schema.String.annotate({
      description: "The invitation's id, as list_invitations answers it.",
    }),
  }),
  success: Schema.Struct({ revoked: Schema.String }),
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Revoke an invitation");

/** The tools that read who is in the workspace, and invite. */
export const PeopleTools = Toolkit.make(
  ListMembers,
  ListInvitations,
  InviteMember,
  RevokeInvitation
);
