import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { BillingUnavailable } from "./billing-unavailable.ts";
import { DeletionIncomplete } from "./deletion-incomplete.ts";
import { Forbidden } from "./forbidden.ts";
import { MediaStoreUnavailable } from "./media-store-unavailable.ts";
import { PartnerOwnsWorkspaces } from "./partner-owns-workspaces.ts";
import { WorkspaceAccess } from "./workspace-access.ts";
import { WorkspaceBusy } from "./workspace-busy.ts";
import { WorkspaceNameMismatch } from "./workspace-name-mismatch.ts";
import { WorkspaceSubscribed } from "./workspace-subscribed.ts";

/**
 * What confirms a workspace's deletion: its name, typed again, and, for a
 * workspace Stripe may still bill, the owner's agreement to cancel its
 * subscription.
 */
export const DeleteWorkspaceSchema = Schema.Struct({
  // The person agreed that the workspace's subscription ends now, without
  // a refund of the period paid for. Without it, a subscribed workspace
  // answers WorkspaceSubscribed.
  cancelSubscriptions: Schema.optionalKey(Schema.Boolean),
  name: Schema.String,
}).annotate({ identifier: "DeleteWorkspace" });

export type DeleteWorkspace = typeof DeleteWorkspaceSchema.Type;

/** What a workspace requires of its members to reach it. */
export const WorkspaceSecuritySchema = Schema.Struct({
  // How many members' accounts do not have two-step verification on, for
  // a reader who may manage members (member:update) alone.
  membersWithoutTwoStep: Schema.optionalKey(Schema.Int),
  // Every member's account must have two-step verification on: a member
  // without it is refused the workspace, in the web app, the command line
  // and MCP clients, until they turn it on. API keys are not concerned.
  twoStepRequired: Schema.Boolean,
}).annotate({ identifier: "WorkspaceSecurity" });

export type WorkspaceSecurity = typeof WorkspaceSecuritySchema.Type;

/** What an owner requires of the workspace's members. */
export const SecureWorkspaceSchema = Schema.Struct({
  twoStepRequired: Schema.Boolean,
}).annotate({ identifier: "SecureWorkspace" });

export type SecureWorkspace = typeof SecureWorkspaceSchema.Type;

/**
 * A workspace itself, and what it requires of its members. Renaming it,
 * changing its members' roles and removing members go through the sign-in
 * service's organization routes, under /api/auth; MembersApi and
 * InvitationsApi list its members and invite.
 */
export class WorkspacesApi extends HttpApiGroup.make("workspaces")
  .add(
    HttpApiEndpoint.delete("delete", "/", {
      error: [
        Forbidden,
        WorkspaceNameMismatch,
        WorkspaceBusy,
        PartnerOwnsWorkspaces,
        WorkspaceSubscribed,
        BillingUnavailable,
        MediaStoreUnavailable,
        DeletionIncomplete,
      ],
      params: { workspaceId: Schema.String },
      payload: DeleteWorkspaceSchema,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes the workspace and everything in it, for good: its channels and their tokens, its posts, its media and their files, its analytics, its notices, its writing assistant usage, what billing recorded of its subscriptions, its members and invitations, and its API keys, which stop working at once. Needs organization:delete (owners), a signed-in member rather than an API key or an OAuth client, and the workspace's name in `name`. Answers 409 while a post of the workspace is being published (`WorkspaceBusy`), and while its partner account still owns workspaces (`PartnerOwnsWorkspaces`): each is deleted through the partner API first. A workspace with a subscription Stripe may still bill answers 409 `WorkspaceSubscribed`, with its plan and the end of the period paid for, unless `cancelSubscriptions` is `true`: then the subscription is cancelled at Stripe at once, with no proration and no final invoice, so the period already paid for is not refunded, except where the law gives a refund (a consumer who withdraws within 14 days of subscribing), and nothing more is charged. Invoices stay with Stripe, as accounting law keeps them for 10 years: download them from the billing page first. Checkouts of the workspace still open at Stripe are expired, so none completes once it is gone; when Stripe cannot be reached, nothing is deleted (503 `BillingUnavailable`). The deletion is recorded by id in the object store before it is done, so that a restored backup deletes the workspace again; when the store cannot be reached, nothing is deleted (503 `MediaStoreUnavailable`). A deletion that fails once the subscription is cancelled, whatever stopped it, the object store included, says so (500 `DeletionIncomplete`): the cancellation stands, nothing was deleted, and deleting again cancels nothing more. The owner is emailed a confirmation.",
        summary: "Delete a workspace",
      })
    )
  )
  .add(
    HttpApiEndpoint.get("security", "/security", {
      error: [Forbidden],
      params: { workspaceId: Schema.String },
      success: WorkspaceSecuritySchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers whether the workspace requires two-step verification of every member, and, to a member who may manage members (member:update), how many members' accounts do not have it on. Any member, application or API key of the workspace may read it.",
        summary: "Get the workspace's security policy",
      })
    )
  )
  .add(
    HttpApiEndpoint.put("secure", "/security", {
      error: [Forbidden],
      params: { workspaceId: Schema.String },
      payload: SecureWorkspaceSchema,
      success: WorkspaceSecuritySchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Requires two-step verification of every member of the workspace, or stops requiring it. Only an owner does this, signed in to Peal in their own session (organization:secure): never an admin, an API key, an application or staff acting as an owner (`personRequired`), and only once their own account has two-step verification on (`twoStepRequired`). It takes effect at once: a member whose account does not have it on is refused the workspace on their next request, through the web app, the command line or an MCP client, with 403 `twoStepRequired`, until they turn it on; their sessions and applications are not signed out. API keys and partner keys keep working. Kept in the workspace's activity log.",
        summary: "Require two-step verification",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId") {}
