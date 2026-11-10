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
        BillingUnavailable,
        DeletionIncomplete,
      ],
      params: { workspaceId: Schema.String },
      payload: DeleteWorkspaceSchema,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes the workspace and everything in it, for good: its channels and their tokens, its posts, its media and their files, its analytics, its notices, its writing assistant usage, what billing recorded of its subscriptions, its members and invitations, and its API keys, which stop working at once. Needs organization:delete (owners), a signed-in member rather than an API key or an OAuth client, and the workspace's name in `name`. Answers 409 while a post of the workspace is being published (`WorkspaceBusy`). A workspace with a subscription Stripe may still bill answers 409 `WorkspaceSubscribed`, with its plan and the end of the period paid for, unless `cancelSubscriptions` is `true`: then the subscription is cancelled at Stripe at once, with no proration and no final invoice, so the period already paid for is not refunded, except where the law gives a refund (a consumer who withdraws within 14 days of subscribing), and nothing more is charged. Invoices stay with Stripe, as accounting law keeps them for 10 years: download them from the billing page first. Checkouts of the workspace still open at Stripe are expired, so none completes once it is gone; when Stripe cannot be reached, nothing is deleted (503 `BillingUnavailable`). A deletion that fails once the subscription is cancelled says so (500 `DeletionIncomplete`): the cancellation stands, nothing was deleted, and deleting again cancels nothing more. The owner is emailed a confirmation.",
        summary: "Delete a workspace",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId") {}
