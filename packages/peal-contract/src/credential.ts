import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { OverviewRefusalSchema } from "./overview.ts";
import { PartnerScopeSchema } from "./partner-scope.ts";
import { PermissionSchema } from "./permission.ts";
import { Unauthenticated } from "./unauthenticated.ts";

/** A workspace a credential names: its id and its name, nothing of it. */
export const CredentialWorkspaceSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
}).annotate({ identifier: "CredentialWorkspace" });

export type CredentialWorkspace = typeof CredentialWorkspaceSchema.Type;

/**
 * The workspace an OAuth client's token is bound to (MCP clients), and what
 * it may do there: the member's role, less what the scopes leave out. Where
 * the workspace refuses the person (`refused`), it may do nothing there.
 */
export const CredentialBoundWorkspaceSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  permissions: Schema.Array(PermissionSchema),
  refused: Schema.NullOr(OverviewRefusalSchema),
}).annotate({ identifier: "CredentialBoundWorkspace" });

export type CredentialBoundWorkspace =
  typeof CredentialBoundWorkspaceSchema.Type;

/** The OAuth client a token was issued to, with what the user allowed it. */
export const CredentialApplicationSchema = Schema.Struct({
  clientId: Schema.String,
  scopes: Schema.Array(Schema.String),
  // Null for a token bound to no workspace, as the command line's is.
  workspace: Schema.NullOr(CredentialBoundWorkspaceSchema),
}).annotate({ identifier: "CredentialApplication" });

export type CredentialApplication = typeof CredentialApplicationSchema.Type;

/** The partner account a partner key belongs to. */
export const CredentialPartnerSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
}).annotate({ identifier: "CredentialPartner" });

export type CredentialPartner = typeof CredentialPartnerSchema.Type;

/**
 * Who a credential is and what it may do, by its kind. Never the key or the
 * token itself, nor anything a workspace holds beyond its name.
 *
 * - `user`: a person, in a session or through an OAuth client
 *   (`application`); a session names no workspace (`GET /api/me` lists
 *   theirs).
 * - `apiKey`: a workspace's API key.
 * - `partnerKey`: a partner's key, which holds `permissions` in each
 *   workspace its partner owns, and `scopes` over those workspaces; it
 *   names none of them (`GET /api/partner/workspaces` lists them).
 */
export const CredentialSchema = Schema.Union([
  Schema.TaggedStruct("user", {
    // Null in a session of the person's own.
    application: Schema.NullOr(CredentialApplicationSchema),
    userId: Schema.String,
  }),
  Schema.TaggedStruct("apiKey", {
    expiresAt: Schema.NullOr(Schema.DateTimeUtc),
    id: Schema.String,
    name: Schema.String,
    permissions: Schema.Array(PermissionSchema),
    // Its first characters, to tell keys apart.
    start: Schema.NullOr(Schema.String),
    workspace: CredentialWorkspaceSchema,
  }),
  Schema.TaggedStruct("partnerKey", {
    expiresAt: Schema.NullOr(Schema.DateTimeUtc),
    id: Schema.String,
    name: Schema.String,
    partner: CredentialPartnerSchema,
    permissions: Schema.Array(PermissionSchema),
    scopes: Schema.Array(PartnerScopeSchema),
    start: Schema.String,
  }),
]).annotate({ identifier: "Credential" });

export type Credential = typeof CredentialSchema.Type;

export class CredentialApi extends HttpApiGroup.make("credential")
  .add(
    HttpApiEndpoint.get("get", "/api/credential", {
      error: [Forbidden, Unauthenticated],
      success: CredentialSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers who the credential this request sends is and what it may do, whatever its kind: a person's session or an OAuth client's token (`user`, with the client's scopes and the workspace its token is bound to, if any), a workspace's API key (`apiKey`: its name, its start, its workspace, its permissions and when it expires) or a partner key (`partnerKey`: its partner, its scopes and the permissions it holds in each workspace the partner owns). Never the key or the token itself. A revoked or expired key answers 401, a suspended account 403, as on every endpoint; a workspace that requires two-step verification does not refuse this answer, which reads none of its data. It counts toward the rate limit as any request does.",
        summary: "Check the credential",
      })
    )
  )
  .middleware(Authentication) {}
