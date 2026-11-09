import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { WorkspaceAccess } from "./workspace-access.ts";
import { WorkspaceBusy } from "./workspace-busy.ts";
import { WorkspaceNameMismatch } from "./workspace-name-mismatch.ts";
import { WorkspaceSubscribed } from "./workspace-subscribed.ts";

/** What confirms a workspace's deletion: its name, typed again. */
export const DeleteWorkspaceSchema = Schema.Struct({
  name: Schema.String,
}).annotate({ identifier: "DeleteWorkspace" });

export type DeleteWorkspace = typeof DeleteWorkspaceSchema.Type;

/**
 * A workspace itself. Renaming it, changing its members' roles and removing
 * members go through the sign-in service's organization routes, under
 * /api/auth; MembersApi and InvitationsApi list its members and invite.
 */
export class WorkspacesApi extends HttpApiGroup.make("workspaces")
  .add(
    HttpApiEndpoint.delete("delete", "/", {
      error: [
        Forbidden,
        WorkspaceNameMismatch,
        WorkspaceBusy,
        WorkspaceSubscribed,
      ],
      params: { workspaceId: Schema.String },
      payload: DeleteWorkspaceSchema,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes the workspace and everything in it, for good: its channels and their tokens, its posts, its media and their files, its analytics, its notices, its writing assistant usage, what billing recorded of its subscriptions, its members and invitations, and its API keys, which stop working at once. Needs organization:delete (owners), a signed-in member rather than an API key or an OAuth client, and the workspace's name in `name`. Answers 409 while a post of the workspace is being published (`WorkspaceBusy`), and while it has a subscription Stripe may still bill (`WorkspaceSubscribed`): cancel it first.",
        summary: "Delete a workspace",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId") {}
