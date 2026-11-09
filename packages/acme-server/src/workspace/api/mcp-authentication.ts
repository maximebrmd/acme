import { CurrentMember } from "acme-contract";
import { Effect, Option, Redacted } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import { Authenticate } from "#workspace/application/authenticate.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";

import { memberOf } from "./principal.ts";

// MCP clients read a JSON-RPC error alongside the HTTP status, as Better
// Auth's requireMcpAuth sends it; -32000 is the implementation-defined code
// it uses.
const jsonRpcError = (
  status: number,
  message: string,
  headers: Readonly<Record<string, string>> = {}
) =>
  HttpServerResponse.jsonUnsafe(
    { error: { code: -32_000, message }, id: null, jsonrpc: "2.0" },
    { headers, status }
  );

// The token works, but its user can no longer act in its workspace. Signing
// in again would not help, so there is no challenge.
const forbidden = () =>
  Effect.succeed(
    jsonRpcError(403, "The workspace this token is bound to is not open to you")
  );

/**
 * Authentication for the MCP endpoint, as Better Auth's requireMcpAuth does
 * it: a request without an OAuth access token issued for the endpoint, or
 * with one that no longer works, gets a 401 whose RFC 9728 challenge leads
 * the client to sign in; one lacking scopes, a 403 that asks for them. A
 * token works in the workspace it is bound to, while its user still belongs
 * to it and is not banned, which is checked on every request. Routes behind
 * it get the member as CurrentMember.
 */
export const McpAuthenticationLive = HttpRouter.middleware<{
  provides: CurrentMember;
}>()(
  Effect.gen(function* mcpAuthentication() {
    const authenticate = yield* Authenticate;
    const members = yield* ResolveMember;

    return (httpEffect) =>
      Effect.gen(function* authenticated() {
        const request = yield* HttpServerRequest.HttpServerRequest;

        const { principal, workspaceId } = yield* authenticate.mcp({
          authorization: Option.fromNullishOr(
            request.headers["authorization"]
          ).pipe(Option.map(Redacted.make)),
          dpopProof: Option.fromNullishOr(request.headers["dpop"]),
          method: request.method,
          path: request.url,
        });

        const actor = yield* members.resolve(principal, workspaceId);

        return yield* httpEffect.pipe(
          Effect.provideService(CurrentMember, memberOf(actor, principal))
        );
      }).pipe(
        Effect.catchTags({
          AuthUnavailable: Effect.die,
          BannedUser: forbidden,
          DirectoryUnavailable: Effect.die,
          InvalidAccessToken: ({ challenge, description, status }) =>
            Effect.succeed(
              jsonRpcError(status, description, {
                "www-authenticate": challenge,
              })
            ),
          NotAMember: forbidden,
          WorkspaceMismatch: forbidden,
        })
      );
  })
).layer;
