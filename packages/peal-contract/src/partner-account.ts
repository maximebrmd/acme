import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { PartnerAccountsClosed } from "./partner-accounts-closed.ts";
import { PartnerDetailsInvalid } from "./partner-details-invalid.ts";
import { PartnerKeyNotFound } from "./partner-key-not-found.ts";
import { PartnerNotFound } from "./partner-not-found.ts";
import { PartnerOwnsWorkspaces } from "./partner-owns-workspaces.ts";
import { PartnerScopeSchema } from "./partner-scope.ts";
import {
  CustomerWorkspacePageSchema,
  defaultWorkspacePageSize,
  maxPartnerLogoUrlLength,
  maxPartnerNameLength,
  maxReturnOrigins,
  maxWorkspacePageSize,
  PartnerSchema,
  PartnerUsageSchema,
  workspaceListQuery,
} from "./partner.ts";
import { PermissionSchema } from "./permission.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/**
 * What a workspace's people read of its partner account: the account and
 * what it holds, if it has one, and whether they may open one themselves
 * on this server.
 */
export const PartnerStandingSchema = Schema.Struct({
  canOpen: Schema.Boolean,
  partner: Schema.NullOr(PartnerSchema),
  usage: Schema.NullOr(PartnerUsageSchema),
}).annotate({ identifier: "PartnerStanding" });

export type PartnerStanding = typeof PartnerStandingSchema.Type;

const partnerName = Schema.String.check(
  Schema.isBetweenLength(1, maxPartnerNameLength)
);

export const OpenPartnerSchema = Schema.Struct({
  name: partnerName,
}).annotate({ identifier: "OpenPartner" });

/** What to change of a partner account: what is left out stays as it is. */
export const PartnerChangeSchema = Schema.Struct({
  // Null removes the logo.
  logoUrl: Schema.optionalKey(
    Schema.NullOr(
      Schema.String.check(Schema.isMaxLength(maxPartnerLogoUrlLength))
    )
  ),
  name: Schema.optionalKey(partnerName),
  // Replaces the whole list.
  returnOrigins: Schema.optionalKey(
    Schema.Array(Schema.String).check(Schema.isMaxLength(maxReturnOrigins))
  ),
}).annotate({ identifier: "PartnerChange" });

export type PartnerChange = typeof PartnerChangeSchema.Type;

export const maxPartnerKeyNameLength = 80;

/** A partner key as listed: never the key itself, which is shown once. */
export const PartnerKeySchema = Schema.Struct({
  createdAt: Schema.DateTimeUtc,
  expiresAt: Schema.NullOr(Schema.DateTimeUtc),
  id: Schema.String,
  name: Schema.String,
  // What it may do in each workspace the partner owns.
  permissions: Schema.Array(PermissionSchema),
  // What it may do with those workspaces themselves.
  scopes: Schema.Array(PartnerScopeSchema),
  // The key's first characters, prefix included, to tell keys apart.
  start: Schema.String,
}).annotate({ identifier: "PartnerKey" });

export type PartnerKey = typeof PartnerKeySchema.Type;

export const NewPartnerKeySchema = Schema.Struct({
  // Days until the key stops working; without it, it works until revoked.
  expiresInDays: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ maximum: 365, minimum: 1 }))
  ),
  name: Schema.String.check(Schema.isBetweenLength(1, maxPartnerKeyNameLength)),
  permissions: Schema.Array(PermissionSchema),
  scopes: Schema.Array(PartnerScopeSchema),
}).annotate({ identifier: "NewPartnerKey" });

export type NewPartnerKey = typeof NewPartnerKeySchema.Type;

export const CreatedPartnerKeySchema = Schema.Struct({
  // The secret, shown this once: send it as `Authorization: Bearer <key>`.
  key: Schema.String,
  partnerKey: PartnerKeySchema,
}).annotate({ identifier: "CreatedPartnerKey" });

/**
 * The permissions a partner key may be given in the workspaces its partner
 * owns. The server's list (src/workspace/domain/partner-key.ts) is the
 * source; a test keeps the two equal.
 */
export const partnerKeyPermissions = [
  "activity:read",
  "analytics:read",
  "assistant:use",
  "assistant:configure",
  "billing:read",
  "channel:read",
  "channel:connect",
  "channel:disconnect",
  "engagement:read",
  "engagement:reply",
  "media:read",
  "media:upload",
  "media:delete",
  "post:read",
  "post:create",
  "post:update",
  "post:delete",
  "post:schedule",
  "post:approve",
  "post:publish",
  "webhook:read",
  "webhook:manage",
] as const satisfies readonly (typeof PermissionSchema.Type)[];

const workspace = { workspaceId: Schema.String };

const inPerson = "a signed-in member rather than an API key or an OAuth client";

/**
 * A workspace's partner account, for the people of that workspace: opening
 * it, what its customers see of it, where hosted pages may send them back,
 * its keys, and the workspaces it owns.
 */
export class PartnerAccountApi extends HttpApiGroup.make("partnerAccount")
  .add(
    HttpApiEndpoint.get("get", "/", {
      error: Forbidden,
      params: workspace,
      success: PartnerStandingSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "The workspace's partner account and what it holds, null when it has none, and whether its people may open one themselves on this server (`canOpen`). Needs partner:read.",
        summary: "Read the workspace's partner account",
      })
    ),
    HttpApiEndpoint.post("open", "/", {
      error: [Forbidden, PartnerAccountsClosed, PartnerDetailsInvalid],
      params: workspace,
      payload: OpenPartnerSchema,
      success: PartnerSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Opens a partner account for the workspace, which becomes its home workspace, under the name its customers will read; answers the one it has when it has one. On a server that opens partner accounts through its staff only, answers 403 \`PartnerAccountsClosed\`. Needs partner:manage, and ${inPerson}.`,
        summary: "Open a partner account",
      })
    ),
    HttpApiEndpoint.patch("update", "/", {
      error: [Forbidden, PartnerNotFound, PartnerDetailsInvalid],
      params: workspace,
      payload: PartnerChangeSchema,
      success: PartnerSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Changes the partner account's name, its logo (an HTTPS URL, shown from that address on the hosted pages; null removes it) or its return origins: what is left out stays as it is. \`returnOrigins\` replaces the whole list, ${maxReturnOrigins} at most: each is an origin as browsers write it (\`https://app.example.com\`: HTTPS, or HTTP on this machine alone, with nothing after the host and port). A hosted page sends a customer back only to an address whose origin is one of these, exactly. Needs partner:manage, and ${inPerson}.`,
        summary: "Change the partner account",
      })
    ),
    HttpApiEndpoint.delete("close", "/", {
      error: [Forbidden, PartnerNotFound, PartnerOwnsWorkspaces],
      params: workspace,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Closes the workspace's partner account: its keys stop working at once. Refused while it owns workspaces (409 \`PartnerOwnsWorkspaces\`): delete each through the partner API first. Needs partner:manage, and ${inPerson}.`,
        summary: "Close the partner account",
      })
    ),
    HttpApiEndpoint.get("listKeys", "/keys", {
      error: [Forbidden, PartnerNotFound],
      params: workspace,
      success: Schema.Array(PartnerKeySchema),
    }).annotateMerge(
      OpenApi.annotations({
        description: "Lists the partner account's keys. Needs partner:read.",
        summary: "List partner keys",
      })
    ),
    HttpApiEndpoint.post("createKey", "/keys", {
      error: [Forbidden, PartnerNotFound, PartnerDetailsInvalid],
      params: workspace,
      payload: NewPartnerKeySchema,
      success: CreatedPartnerKeySchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Creates a partner key, and answers with the key itself, which is not shown again. It acts in every workspace the partner owns, with \`permissions\` (what a product does for its customers: channels, media, posts, analytics, the writing assistant, webhooks, reading the plan's usage; never members, invitations, API keys or billing changes, which answer 422), and on those workspaces themselves with \`scopes\`. It never acts in the home workspace, nor in any workspace the partner does not own. Needs partner:manage, and ${inPerson}: keys cannot create keys.`,
        summary: "Create a partner key",
      })
    ),
    HttpApiEndpoint.delete("revokeKey", "/keys/:partnerKeyId", {
      error: [Forbidden, PartnerNotFound, PartnerKeyNotFound],
      params: { ...workspace, partnerKeyId: Schema.String },
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Revokes a partner key: it stops working at once. Needs partner:manage.",
        summary: "Revoke a partner key",
      })
    ),
    HttpApiEndpoint.get("listWorkspaces", "/workspaces", {
      error: [Forbidden, PartnerNotFound, HttpApiError.BadRequest],
      params: workspace,
      query: workspaceListQuery,
      success: CustomerWorkspacePageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspaces the partner account owns, newest first, each with the number of channels connected in it, ${defaultWorkspacePageSize} a page unless \`limit\` (at most ${maxWorkspacePageSize}) says otherwise, with the filters and the paging of the partner API's list. Needs partner:read.`,
        summary: "List the partner account's workspaces",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/partner") {}
