import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { BillingUnavailable } from "./billing-unavailable.ts";
import { DeletionIncomplete } from "./deletion-incomplete.ts";
import { ExternalIdTaken } from "./external-id-taken.ts";
import { Forbidden } from "./forbidden.ts";
import { IdempotencyKeyReused } from "./idempotency-key-reused.ts";
import { MediaStoreUnavailable } from "./media-store-unavailable.ts";
import { PartnerDetailsInvalid } from "./partner-details-invalid.ts";
import { PartnerHealthSchema } from "./partner-health.ts";
import { WorkspaceBusy } from "./workspace-busy.ts";
import { WorkspaceNotFound } from "./workspace-not-found.ts";

// A partner account is a product that embeds Peal: it owns one workspace
// for each of its own customers, acts in them with partner keys, and lets
// each customer connect their accounts through hosted links, without a
// Peal account. The server's rules (src/workspace/domain/partner.ts,
// customer-workspace.ts) are the source of the limits below; a test keeps
// them equal.

export const maxPartnerNameLength = 80;

export const maxPartnerLogoUrlLength = 2048;

/** How many return origins a partner registers at most. */
export const maxReturnOrigins = 20;

export const maxWorkspaceNameLength = 120;

export const maxExternalIdLength = 255;

export const defaultWorkspacePageSize = 50;

export const maxWorkspacePageSize = 100;

/** The longest `Idempotency-Key` a workspace creation takes. */
export const maxCreationKeyLength = 255;

/** How long Peal remembers a workspace creation's `Idempotency-Key`. */
export const creationKeyLifetimeHours = 24;

/** A partner account, as its people and its keys read it. */
export const PartnerSchema = Schema.Struct({
  createdAt: Schema.DateTimeUtc,
  id: Schema.String,
  // Shown on the hosted pages, from its own address.
  logoUrl: Schema.NullOr(Schema.String),
  // What the partner's customers read on the hosted pages.
  name: Schema.String,
  // The origins a hosted page may send a customer back to.
  returnOrigins: Schema.Array(Schema.String),
  // Its home workspace, whose plan its workspaces share.
  workspaceId: Schema.String,
}).annotate({ identifier: "Partner" });

export type Partner = typeof PartnerSchema.Type;

/** What a partner held at the end of a day (UTC). */
export const PartnerUsageDaySchema = Schema.Struct({
  channels: Schema.Int,
  // The day, as `2026-11-10`.
  day: Schema.String,
  workspaces: Schema.Int,
}).annotate({ identifier: "PartnerUsageDay" });

/**
 * What a partner account holds now: the workspaces it owns, and the
 * channels connected in them and in its home workspace, which one plan
 * holds together; and what it held each of the last 35 days.
 */
export const PartnerUsageSchema = Schema.Struct({
  channels: Schema.Int,
  days: Schema.Array(PartnerUsageDaySchema),
  workspaces: Schema.Int,
}).annotate({ identifier: "PartnerUsage" });

export type PartnerUsage = typeof PartnerUsageSchema.Type;

export const PartnerOverviewSchema = Schema.Struct({
  partner: PartnerSchema,
  usage: PartnerUsageSchema,
}).annotate({ identifier: "PartnerOverview" });

export type PartnerOverview = typeof PartnerOverviewSchema.Type;

/** A workspace a partner owns: one of its customers. */
export const CustomerWorkspaceSchema = Schema.Struct({
  // The channels connected in it.
  channels: Schema.Int,
  createdAt: Schema.DateTimeUtc,
  // The partner's own id for its customer, when it gave one.
  externalId: Schema.NullOr(Schema.String),
  id: Schema.String,
  name: Schema.String,
}).annotate({ identifier: "CustomerWorkspace" });

export type CustomerWorkspace = typeof CustomerWorkspaceSchema.Type;

export const CustomerWorkspacePageSchema = Schema.Struct({
  // What to pass as `before` for the next page; null on the last one.
  next: Schema.NullOr(Schema.String),
  // How many workspaces the filters find in all.
  total: Schema.Int,
  workspaces: Schema.Array(CustomerWorkspaceSchema),
}).annotate({ identifier: "CustomerWorkspacePage" });

export type CustomerWorkspacePage = typeof CustomerWorkspacePageSchema.Type;

const name = Schema.String.check(
  Schema.isBetweenLength(1, maxWorkspaceNameLength)
);

const externalId = Schema.String.check(
  Schema.isBetweenLength(1, maxExternalIdLength)
);

export const NewCustomerWorkspaceSchema = Schema.Struct({
  // The partner's own id for its customer: unique among its workspaces.
  externalId: Schema.optionalKey(externalId),
  name,
}).annotate({ identifier: "NewCustomerWorkspace" });

export type NewCustomerWorkspace = typeof NewCustomerWorkspaceSchema.Type;

/** What to change of a workspace: what is left out stays as it is. */
export const CustomerWorkspaceChangeSchema = Schema.Struct({
  // Null removes it.
  externalId: Schema.optionalKey(Schema.NullOr(externalId)),
  name: Schema.optionalKey(name),
}).annotate({ identifier: "CustomerWorkspaceChange" });

export type CustomerWorkspaceChange = typeof CustomerWorkspaceChangeSchema.Type;

/** The filters and the page of a list of a partner's workspaces. */
export const workspaceListQuery = {
  before: Schema.optionalKey(Schema.String),
  externalId: Schema.optionalKey(externalId),
  limit: Schema.optionalKey(
    Schema.Int.check(
      Schema.isBetween({ maximum: maxWorkspacePageSize, minimum: 1 })
    )
  ),
  name: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(120))),
};

const workspace = { workspaceId: Schema.String };

const keyOnly =
  "Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.";

/** A page of the partner's customers' health: the list's own paging. */
export const partnerHealthQuery = {
  before: Schema.optionalKey(Schema.String),
  limit: Schema.optionalKey(
    Schema.Int.check(
      Schema.isBetween({ maximum: maxWorkspacePageSize, minimum: 1 })
    )
  ),
};

/** What both copies of the partner's customers' health answer. */
export const partnerHealthDescription = `Answers, for each workspace the partner owns, what needs attention: its channels (\`connected\`, \`toReconnect\`: to reconnect, as \`channel.reconnect_needed\` told; \`off\`: turned off), its posts (\`scheduledNext7Days\`, \`awaitingApproval\`, \`failedLast7Days\`: finished in the last 7 days with a channel that failed, as \`post.failed\` told; \`unconfirmedLast7Days\`: one that may be live and must be checked) and its inbox (\`unanswered\`: threads with a comment waiting for an answer). It tells the state at the time of the call; webhooks tell each change as it happens. A section is null where the credential may not read it, never zero. The partner's home workspace is not listed: it is no customer. Newest first, ${defaultWorkspacePageSize} a page unless \`limit\` (at most ${maxWorkspacePageSize}) says otherwise, in the order and with the cursor of the list of the partner's workspaces (pass \`next\` as \`before\`; anything else is refused, 400): page through every customer to find those that need attention, as nothing filters them. \`account\` comes with the first page only: whether the account's workspaces, which share one plan and one channel count, hold more channels than the plan allows, and so schedule and publish nothing (null on a server that does not bill); with no customer yet, it is the home workspace's own standing.`;

/**
 * A partner's own account and the workspaces it owns, for its backend,
 * with a partner key. Inside each workspace, the same key calls the
 * workspace endpoints (`/api/workspaces/{workspaceId}/…`) with the
 * permissions it was given.
 */
export class PartnerApi extends HttpApiGroup.make("partner")
  .add(
    HttpApiEndpoint.get("account", "/", {
      error: Forbidden,
      success: PartnerOverviewSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `The partner account the key belongs to, with what it holds: the workspaces it owns and the channels connected across them and its home workspace, now and at the end of each of the last 35 days (UTC). ${keyOnly}`,
        summary: "Read the partner account",
      })
    ),
    HttpApiEndpoint.get("overview", "/overview", {
      error: [Forbidden, HttpApiError.BadRequest],
      query: partnerHealthQuery,
      success: PartnerHealthSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `${partnerHealthDescription} Each section needs the permission that reads it in a workspace: \`channel:read\`, \`post:read\`, \`engagement:read\`, and \`mayApprove\` says whether the key holds \`post:approve\`. Needs the scope workspaces:read. ${keyOnly}`,
        summary: "See which customers need attention",
      })
    ),
    HttpApiEndpoint.get("listWorkspaces", "/workspaces", {
      error: [Forbidden, HttpApiError.BadRequest],
      query: workspaceListQuery,
      success: CustomerWorkspacePageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspaces the partner owns, newest first, each with the number of channels connected in it, ${defaultWorkspacePageSize} a page unless \`limit\` (at most ${maxWorkspacePageSize}) says otherwise. \`externalId\` finds the one workspace with that external id, exactly; \`name\` those whose name holds the text, whatever its case. \`total\` counts what the filters find; pass the page's \`next\` as \`before\` for the next page, as it is: it is a position in the list, which stays good when workspaces before it are offboarded, and anything else is refused (400). Needs the scope workspaces:read. ${keyOnly}`,
        summary: "List the partner's workspaces",
      })
    ),
    HttpApiEndpoint.post("createWorkspace", "/workspaces", {
      error: [
        Forbidden,
        PartnerDetailsInvalid,
        ExternalIdTaken,
        IdempotencyKeyReused,
        WorkspaceNotFound,
      ],
      headers: {
        "idempotency-key": Schema.optionalKey(
          Schema.String.check(Schema.isBetweenLength(1, maxCreationKeyLength))
        ),
      },
      payload: NewCustomerWorkspaceSchema,
      success: CustomerWorkspaceSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Creates a workspace for one of the partner's customers: it has no members, shares the plan of the partner's home workspace, and the partner's keys act in it. \`externalId\`, the partner's own id for its customer, is unique among the partner's workspaces: a second workspace with it answers 409 \`ExternalIdTaken\` with the id of the one that has it, so a creation sent twice never makes two. Send an \`Idempotency-Key\` header (any text of your choosing, at most ${maxCreationKeyLength} characters, such as a UUID) to make a request safe to send again: within ${creationKeyLifetimeHours} hours, the same key with the same body answers the workspace the first request made, as it now stands, and makes no other; the same key with another body is refused (\`IdempotencyKeyReused\`), and answers \`WorkspaceNotFound\` once that workspace was deleted. Keys are kept per partner, as digests. Needs the scope workspaces:write. ${keyOnly}`,
        summary: "Create a workspace for a customer",
      })
    ),
    HttpApiEndpoint.get("getWorkspace", "/workspaces/:workspaceId", {
      error: [Forbidden, WorkspaceNotFound],
      params: workspace,
      success: CustomerWorkspaceSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `One workspace the partner owns, with the number of channels connected in it. A workspace of anyone else answers 404, as one that does not exist. Needs the scope workspaces:read. ${keyOnly}`,
        summary: "Read a workspace of the partner",
      })
    ),
    HttpApiEndpoint.patch("updateWorkspace", "/workspaces/:workspaceId", {
      error: [
        Forbidden,
        WorkspaceNotFound,
        PartnerDetailsInvalid,
        ExternalIdTaken,
      ],
      params: workspace,
      payload: CustomerWorkspaceChangeSchema,
      success: CustomerWorkspaceSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Changes a workspace's name or external id: what is left out stays as it is, and a null \`externalId\` removes it. An external id another of the partner's workspaces has answers 409 \`ExternalIdTaken\`. Needs the scope workspaces:write. ${keyOnly}`,
        summary: "Change a workspace of the partner",
      })
    ),
    HttpApiEndpoint.delete("deleteWorkspace", "/workspaces/:workspaceId", {
      error: [
        Forbidden,
        WorkspaceNotFound,
        WorkspaceBusy,
        BillingUnavailable,
        MediaStoreUnavailable,
        DeletionIncomplete,
      ],
      params: workspace,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Offboards a customer: deletes the workspace and everything in it, for good, as deleting a workspace does for its owner: its channels and their tokens (revoked at the platforms that take it, when no other workspace connects the same account), its posts, scheduled ones included, which then go out nowhere, its media and their files, its analytics, its webhook endpoints and their logs, its connect links. It cannot be undone. Answers 409 while a post of the workspace is being published (\`WorkspaceBusy\`): send it again a moment later. The deletion is recorded by id in the object store before it is done, so that a restored backup deletes the workspace again; when the store cannot be reached, nothing is deleted (503 \`MediaStoreUnavailable\`). Only a workspace the partner owns: any other answers 404. Needs the scope workspaces:delete. ${keyOnly}`,
        summary: "Delete a workspace of the partner",
      })
    )
  )
  .middleware(Authentication)
  .prefix("/api/partner") {}
