import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

// OAuth discovery (RFC 8414, RFC 9728), in the field names the RFCs give.

/** RFC 9728 protected resource metadata. */
export const ProtectedResourceSchema = Schema.Struct({
  authorization_servers: Schema.Array(Schema.String),
  // The identifier tokens are issued for: what a client asks a token for.
  resource: Schema.String,
  scopes_supported: Schema.optional(Schema.Array(Schema.String)),
}).annotate({ identifier: "ProtectedResource" });

export type ProtectedResource = typeof ProtectedResourceSchema.Type;

/** RFC 8414 authorization server metadata, the fields Peal's clients read. */
export const AuthorizationServerSchema = Schema.Struct({
  device_authorization_endpoint: Schema.optional(Schema.String),
  issuer: Schema.String,
  // Present when MCP clients may register themselves.
  registration_endpoint: Schema.optional(Schema.String),
  revocation_endpoint: Schema.optional(Schema.String),
  token_endpoint: Schema.String,
}).annotate({ identifier: "AuthorizationServer" });

export type AuthorizationServer = typeof AuthorizationServerSchema.Type;

/** Where clients learn which tokens to ask for, and where. */
export class OAuthDiscoveryApi extends HttpApiGroup.make("discovery").add(
  HttpApiEndpoint.get(
    "apiResource",
    "/.well-known/oauth-protected-resource/api",
    { success: ProtectedResourceSchema }
  ).annotateMerge(
    OpenApi.annotations({
      summary: "Describe the HTTP API as an OAuth protected resource",
    })
  ),
  HttpApiEndpoint.get(
    "mcpResource",
    "/.well-known/oauth-protected-resource/api/mcp",
    { success: ProtectedResourceSchema }
  ).annotateMerge(
    OpenApi.annotations({
      summary: "Describe the MCP endpoint as an OAuth protected resource",
    })
  ),
  HttpApiEndpoint.get(
    "authorizationServer",
    "/.well-known/oauth-authorization-server/api/auth",
    { success: AuthorizationServerSchema }
  ).annotateMerge(
    OpenApi.annotations({ summary: "Describe the OAuth authorization server" })
  )
) {}
