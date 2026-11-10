import { Context, Effect, Layer, Option, Redacted } from "effect";

import type { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import type { Principal } from "#workspace/domain/principal.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { AuthGateway } from "./auth-gateway.ts";
import type { AccessTokenRequest, BoundPrincipal } from "./auth-gateway.ts";
import type { AuthUnavailable } from "./auth-unavailable.ts";
import type { InvalidAccessToken } from "./invalid-access-token.ts";
import { NotSignedIn } from "./not-signed-in.ts";

const orNotSignedIn = <A, E>(
  found: Effect.Effect<Option.Option<A>, E>
): Effect.Effect<A, E | NotSignedIn> =>
  found.pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(new NotSignedIn()),
        onSome: Effect.succeed,
      })
    )
  );

const isEmpty = (secret: Redacted.Redacted): boolean =>
  Redacted.value(secret).trim() === "";

// OAuth access tokens are JWTs: three base64url segments. API keys never
// contain a dot, whatever their prefix becomes.
const jwtSyntax = /^[\w-]+\.[\w-]+\.[\w-]+$/u;

const bearerSyntax = /^Bearer (?<token>\S+)$/iu;

// The API key an Authorization header carries, if what it carries as a
// bearer token is not an OAuth access token.
const apiKeyIn = (
  authorization: Option.Option<Redacted.Redacted>
): Option.Option<Redacted.Redacted> =>
  authorization.pipe(
    Option.flatMapNullishOr(
      (header) => bearerSyntax.exec(Redacted.value(header))?.groups?.["token"]
    ),
    Option.filter((token) => !jwtSyntax.test(token)),
    Option.map((token) => Redacted.make(token))
  );

// The workspace an API key acts in on the MCP endpoint, whose tools work in
// one workspace: the key's own. A key that one day spans several
// workspaces, as a partner's would, names the one it means here (a header,
// or a tool argument), and nowhere else.
const workspaceOfKey = (principal: ApiKeyPrincipal) => principal.workspaceId;

/** A request with a bearer token, besides the token itself. */
export type BearerRequest = Omit<AccessTokenRequest, "authorization">;

/**
 * Who a request is, from its session cookie, its API key or its OAuth access
 * token.
 */
export class Authenticate extends Context.Service<
  Authenticate,
  {
    readonly apiKey: (
      token: Redacted.Redacted
    ) => Effect.Effect<ApiKeyPrincipal, AuthUnavailable | NotSignedIn>;
    /**
     * Who a bearer token sent to the HTTP API is: the user an OAuth access
     * token acts for, or an API key.
     */
    readonly bearer: (
      token: Redacted.Redacted,
      request: BearerRequest
    ) => Effect.Effect<Principal, AuthUnavailable | NotSignedIn>;
    /** Whether a request sending cookies comes from a trusted origin. */
    readonly isTrustedOrigin: (origin: Option.Option<string>) => boolean;
    /**
     * Who a request to the MCP endpoint acts for, and in which workspace:
     * the user of its OAuth access token, in the workspace the token is
     * bound to, or its API key, in the key's workspace. A key that does
     * not work is answered as a missing token is, with the challenge that
     * leads a client to sign in.
     */
    readonly mcp: (
      request: AccessTokenRequest
    ) => Effect.Effect<BoundPrincipal, AuthUnavailable | InvalidAccessToken>;
    readonly session: (
      cookies: Redacted.Redacted,
      options: { readonly fresh: boolean }
    ) => Effect.Effect<UserPrincipal, AuthUnavailable | NotSignedIn>;
  }
>()("peal-server/workspace/application/Authenticate") {
  static readonly layer = Layer.effect(
    Authenticate,
    Effect.gen(function* authenticate() {
      const gateway = yield* AuthGateway;

      const apiKey = (token: Redacted.Redacted) =>
        isEmpty(token)
          ? Effect.fail(new NotSignedIn())
          : orNotSignedIn(gateway.apiKey(token));

      // The API answers a token that does not work with a plain 401: only
      // the MCP endpoint's clients look for a challenge.
      const accessToken = (token: Redacted.Redacted, request: BearerRequest) =>
        gateway
          .apiToken({
            ...request,
            authorization: Option.some(
              Redacted.make(`Bearer ${Redacted.value(token)}`)
            ),
          })
          .pipe(
            Effect.catchTag("InvalidAccessToken", () =>
              Effect.fail(new NotSignedIn())
            )
          );

      return Authenticate.of({
        apiKey,
        bearer: (token, request) =>
          jwtSyntax.test(Redacted.value(token))
            ? accessToken(token, request)
            : apiKey(token),
        isTrustedOrigin: (origin) =>
          Option.exists(origin, (value) => gateway.isTrustedOrigin(value)),
        mcp: (request) =>
          Option.match(apiKeyIn(request.authorization), {
            onNone: () => gateway.mcpToken(request),
            onSome: (key) =>
              gateway.apiKey(key).pipe(
                Effect.flatMap(
                  Option.match({
                    // The challenge of a request without a token.
                    onNone: (): Effect.Effect<
                      BoundPrincipal,
                      AuthUnavailable | InvalidAccessToken
                    > =>
                      gateway.mcpToken({
                        ...request,
                        authorization: Option.none(),
                      }),
                    onSome: (principal) =>
                      Effect.succeed<BoundPrincipal>({
                        principal,
                        workspaceId: workspaceOfKey(principal),
                      }),
                  })
                )
              ),
          }),
        session: (cookies, options) =>
          isEmpty(cookies)
            ? Effect.fail(new NotSignedIn())
            : orNotSignedIn(gateway.session(cookies, options)),
      });
    })
  );
}
