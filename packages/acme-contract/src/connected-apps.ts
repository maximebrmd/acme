import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { ConnectedAppNotFound } from "./connected-app-not-found.ts";
import { Forbidden } from "./forbidden.ts";

/**
 * An application the user let act for them through OAuth, such as the
 * command line or an MCP client: what it may do, and in which workspaces.
 */
export const ConnectedAppSchema = Schema.Struct({
  // When the user first let it in.
  authorizedAt: Schema.DateTimeUtc,
  clientId: Schema.String,
  // When it last signed in or renewed its access; null if it never did.
  lastUsedAt: Schema.NullOr(Schema.DateTimeUtc),
  // The name the application registered with, if any.
  name: Schema.NullOr(Schema.String),
  // The scopes the user agreed to, such as `workspace:read`.
  scopes: Schema.Array(Schema.String),
  // Its home page, as it registered it.
  uri: Schema.NullOr(Schema.String),
  // The workspaces its access is bound to; none for the command line, which
  // acts in whichever workspace a request names.
  workspaces: Schema.Array(
    Schema.Struct({ id: Schema.String, name: Schema.NullOr(Schema.String) })
  ),
}).annotate({ identifier: "ConnectedApp" });

export type ConnectedApp = typeof ConnectedAppSchema.Type;

/**
 * The applications that act for the signed-in user. Only the user sees them,
 * signed in with their own session or through Acme's command line, and
 * only the user, in their own session, revokes them: API keys, other OAuth
 * clients and staff impersonating the user get 403.
 */
export class ConnectedAppsApi extends HttpApiGroup.make("connectedApps")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: [Forbidden],
      success: Schema.Array(ConnectedAppSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the applications the user agreed to let act for them, and those still signed in with a refresh token, most recently authorized first. Open to the user in their own session and to Acme's command line.",
        summary: "List connected applications",
      })
    ),
    HttpApiEndpoint.delete("revoke", "/:clientId", {
      error: [Forbidden, ConnectedAppNotFound],
      params: { clientId: Schema.String },
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Withdraws what the user agreed to and revokes the application's refresh tokens: it can no longer renew its access, and must ask again. An access token it already holds works until it expires, within 15 minutes.",
        summary: "Revoke a connected application",
      })
    )
  )
  .middleware(Authentication)
  .prefix("/api/me/connected-apps") {}
