import { Context, Effect, Layer, Option, Redacted, Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import { partnerKeyPrefix } from "#workspace/domain/partner-key.ts";
import type { Principal } from "#workspace/domain/principal.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { AuthGateway } from "./auth-gateway.ts";
import type { AccessTokenRequest, BoundPrincipal } from "./auth-gateway.ts";
import { AuthUnavailable } from "./auth-unavailable.ts";
import type { InvalidAccessToken } from "./invalid-access-token.ts";
import { NotSignedIn } from "./not-signed-in.ts";
import { PartnerKeys } from "./partner-keys.ts";
import { WorkspaceNotNamed } from "./workspace-not-named.ts";

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
// one workspace: the key's own.
const workspaceOfKey = (principal: ApiKeyPrincipal) => principal.workspaceId;

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

// A workspace id no workspace has: what a partner key names when what it
// names is no id at all, so it is answered as any workspace its partner
// does not own.
const noWorkspace = WorkspaceIdSchema.make(
  "00000000-0000-4000-8000-000000000000"
);

/**
 * The workspace a partner key acts in on the MCP endpoint. Its key spans
 * every workspace its partner owns, so the client names one with each
 * request, by id (the `Peal-Workspace` header), and nowhere else: whether
 * the partner owns it is checked like any workspace's access, afterwards.
 */
const workspaceNamed = (
  named: Option.Option<string>
): Effect.Effect<WorkspaceId, WorkspaceNotNamed> =>
  Option.match(named.pipe(Option.map((value) => value.trim())), {
    onNone: () => Effect.fail(new WorkspaceNotNamed()),
    onSome: (value) =>
      value === ""
        ? Effect.fail(new WorkspaceNotNamed())
        : Effect.succeed(
            Option.getOrElse(decodeWorkspaceId(value), () => noWorkspace)
          ),
  });

/** A request with a bearer token, besides the token itself. */
export type BearerRequest = Omit<AccessTokenRequest, "authorization">;

/** Why a request to the MCP endpoint is not let in. */
export type McpRefusal =
  | AuthUnavailable
  | InvalidAccessToken
  | WorkspaceNotNamed;

/** A request to the MCP endpoint, as its authentication reads it. */
export interface McpRequest extends AccessTokenRequest {
  /** The workspace the request names (`Peal-Workspace`), if it names one. */
  readonly workspace: Option.Option<string>;
}

/**
 * Who a request is, from its session cookie, its API key, its partner key
 * or its OAuth access token.
 */
export class Authenticate extends Context.Service<
  Authenticate,
  {
    readonly apiKey: (
      token: Redacted.Redacted
    ) => Effect.Effect<ApiKeyPrincipal, AuthUnavailable | NotSignedIn>;
    /**
     * Who a bearer token sent to the HTTP API is: the user an OAuth access
     * token acts for, an API key, or a partner key, told by its prefix.
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
     * bound to, its API key, in the key's workspace, or its partner key,
     * in the workspace the request names (`WorkspaceNotNamed` without
     * one). A key that does not work is answered as a missing token is,
     * with the challenge that leads a client to sign in.
     */
    readonly mcp: (
      request: McpRequest
    ) => Effect.Effect<BoundPrincipal, McpRefusal>;
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
      const partnerKeys = yield* PartnerKeys;

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

      // The partner keys are Peal's own, not the sign-in service's: the
      // database not answering reads as the sign-in service not answering.
      const partnerKey = (token: Redacted.Redacted) =>
        orNotSignedIn(
          partnerKeys
            .verify(token)
            .pipe(
              Effect.mapError(({ cause }) => new AuthUnavailable({ cause }))
            )
        );

      const keyOf = (token: Redacted.Redacted) =>
        Redacted.value(token).startsWith(partnerKeyPrefix)
          ? partnerKey(token)
          : apiKey(token);

      return Authenticate.of({
        apiKey,
        bearer: (token, request) =>
          jwtSyntax.test(Redacted.value(token))
            ? accessToken(token, request)
            : keyOf(token),
        isTrustedOrigin: (origin) =>
          Option.exists(origin, (value) => gateway.isTrustedOrigin(value)),
        mcp: ({ workspace, ...request }) => {
          // The challenge of a request without a token.
          const challenged: Effect.Effect<BoundPrincipal, McpRefusal> =
            gateway.mcpToken({ ...request, authorization: Option.none() });

          return Option.match(apiKeyIn(request.authorization), {
            onNone: () => gateway.mcpToken(request),
            onSome: (key): Effect.Effect<BoundPrincipal, McpRefusal> =>
              Redacted.value(key).startsWith(partnerKeyPrefix)
                ? partnerKeys.verify(key).pipe(
                    Effect.mapError(
                      ({ cause }) => new AuthUnavailable({ cause })
                    ),
                    Effect.flatMap(
                      Option.match({
                        onNone: () => challenged,
                        onSome: (principal) =>
                          workspaceNamed(workspace).pipe(
                            Effect.map((workspaceId): BoundPrincipal => ({
                              principal,
                              workspaceId,
                            }))
                          ),
                      })
                    )
                  )
                : gateway.apiKey(key).pipe(
                    Effect.flatMap(
                      Option.match({
                        onNone: () => challenged,
                        onSome: (principal) =>
                          Effect.succeed<BoundPrincipal>({
                            principal,
                            workspaceId: workspaceOfKey(principal),
                          }),
                      })
                    )
                  ),
          });
        },
        session: (cookies, options) =>
          isEmpty(cookies)
            ? Effect.fail(new NotSignedIn())
            : orNotSignedIn(gateway.session(cookies, options)),
      });
    })
  );
}
