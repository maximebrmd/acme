import { Context } from "effect";
import type { Effect, Option, Redacted } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import type { AuthUnavailable } from "./auth-unavailable.ts";
import type { InvalidAccessToken } from "./invalid-access-token.ts";

/** A request that carries an OAuth access token, as the server received it. */
export interface AccessTokenRequest {
  /** The Authorization header: `Bearer <token>`, or `DPoP <token>`. */
  readonly authorization: Option.Option<Redacted.Redacted>;
  /** The proof of a token bound to the client's key (RFC 9449). */
  readonly dpopProof: Option.Option<string>;
  readonly method: string;
  /** The path and query the request was sent to. */
  readonly path: string;
}

/** A user, through an OAuth client bound to one of their workspaces. */
export interface BoundPrincipal {
  readonly principal: UserPrincipal;
  readonly workspaceId: WorkspaceId;
}

/** Checks credentials with the sign-in service (Better Auth). */
export class AuthGateway extends Context.Service<
  AuthGateway,
  {
    /**
     * The API key's principal, if the key is valid and the workspace that
     * owns it still exists.
     */
    readonly apiKey: (
      key: Redacted.Redacted
    ) => Effect.Effect<Option.Option<ApiKeyPrincipal>, AuthUnavailable>;
    /**
     * The user an OAuth access token issued for the HTTP API acts for, with
     * its grant.
     */
    readonly apiToken: (
      request: AccessTokenRequest
    ) => Effect.Effect<UserPrincipal, AuthUnavailable | InvalidAccessToken>;
    /** Whether cookie-authenticated requests may come from this origin. */
    readonly isTrustedOrigin: (origin: string) => boolean;
    /**
     * The user and workspace an OAuth access token issued for the MCP
     * endpoint acts for: such tokens are always bound to a workspace.
     */
    readonly mcpToken: (
      request: AccessTokenRequest
    ) => Effect.Effect<BoundPrincipal, AuthUnavailable | InvalidAccessToken>;
    /**
     * The principal of the session the cookies carry. `fresh` reads the
     * session from the database, not from the copy cached in a cookie for a
     * few minutes, so a session revoked a moment ago no longer works.
     */
    readonly session: (
      cookies: Redacted.Redacted,
      options: { readonly fresh: boolean }
    ) => Effect.Effect<Option.Option<UserPrincipal>, AuthUnavailable>;
  }
>()("peal-server/workspace/application/AuthGateway") {}
