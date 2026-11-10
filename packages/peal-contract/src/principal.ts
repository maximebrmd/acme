import { Schema } from "effect";

import { PartnerScopeSchema } from "./partner-scope.ts";
import { PermissionSchema } from "./permission.ts";

/**
 * What an OAuth client may do on a user's behalf: the scopes the user agreed
 * to, and the workspace its token is bound to (MCP clients), if any.
 */
export const OAuthGrantSchema = Schema.Struct({
  clientId: Schema.String,
  scopes: Schema.Array(Schema.String),
  workspaceId: Schema.NullOr(Schema.String),
}).annotate({ identifier: "OAuthGrant" });

export type OAuthGrant = typeof OAuthGrantSchema.Type;

/**
 * Whoever a request authenticates as: a user, signed in or through an OAuth
 * client, an API key of a workspace, or a partner key, which acts in the
 * workspaces its partner owns.
 */
export const PrincipalSchema = Schema.Union([
  Schema.TaggedStruct("user", {
    // Staff acting as this user, when they impersonate them.
    impersonatedBy: Schema.NullOr(Schema.String),
    // The OAuth client acting for the user, when the request carries its
    // access token rather than a session.
    oauth: Schema.optionalKey(OAuthGrantSchema),
    userId: Schema.String,
  }),
  Schema.TaggedStruct("apiKey", {
    apiKeyId: Schema.String,
    permissions: Schema.Array(PermissionSchema),
    workspaceId: Schema.String,
  }),
  Schema.TaggedStruct("partnerKey", {
    partnerId: Schema.String,
    partnerKeyId: Schema.String,
    // What it may do in each workspace its partner owns.
    permissions: Schema.Array(PermissionSchema),
    // What it may do with those workspaces themselves.
    scopes: Schema.Array(PartnerScopeSchema),
  }),
]);

export type Principal = typeof PrincipalSchema.Type;

/** Someone acting in one workspace, with what they may do there. */
export const MemberSchema = Schema.Struct({
  permissions: Schema.Array(PermissionSchema),
  principal: PrincipalSchema,
  workspaceId: Schema.String,
});

export type Member = typeof MemberSchema.Type;
