import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** Someone who belongs to the workspace, with their role there. */
export const WorkspaceMemberSchema = Schema.Struct({
  email: Schema.String,
  // When they joined the workspace.
  joinedAt: Schema.DateTimeUtc,
  name: Schema.String,
  // One of the roles RoleSchema lists.
  role: Schema.String,
  // Whether their account has two-step verification on, for a reader who
  // may manage members (member:update) alone.
  twoStepEnabled: Schema.optionalKey(Schema.Boolean),
  userId: Schema.String,
}).annotate({ identifier: "WorkspaceMember" });

export type WorkspaceMember = typeof WorkspaceMemberSchema.Type;

/**
 * Who belongs to a workspace. Changing a member's role and removing a
 * member go through the sign-in service's organization routes, under
 * /api/auth.
 */
export class MembersApi extends HttpApiGroup.make("members")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: [Forbidden],
      params: { workspaceId: Schema.String },
      success: Schema.Array(WorkspaceMemberSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the workspace's members, in the order they joined, with their name, email address and role, and, to a member who may manage members (member:update), whether each one's account has two-step verification on. Every member may see them, as the workspace's settings show them; an API key may not, as members' addresses are not a script's to read.",
        summary: "List members",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/members") {}
