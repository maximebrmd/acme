import { createResourceServerChallenge } from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";
import {
  createDpopReplayStore,
  enforceDpopBinding,
  isDpopBindingError,
  parseAccessTokenAuthorization,
  verifyJwsAccessToken,
} from "better-auth/oauth2";
import { Effect, Option, Redacted, Schema } from "effect";

import type { AccessTokenRequest } from "#workspace/application/auth-gateway.ts";
import { AuthUnavailable } from "#workspace/application/auth-unavailable.ts";
import { InvalidAccessToken } from "#workspace/application/invalid-access-token.ts";

import { BetterAuth } from "./better-auth.ts";
import { issuerOf } from "./oauth.ts";
import { AuthSettings } from "./settings.ts";

// Failures of fetching the keys, as opposed to keys that do not verify.
const unavailableKeyCodes: ReadonlySet<string> = new Set([
  "ERR_JWKS_INVALID",
  "ERR_JWKS_MULTIPLE_MATCHING_KEYS",
  "ERR_JWKS_TIMEOUT",
]);

const decodeCode = Schema.decodeUnknownOption(
  Schema.Struct({ code: Schema.String })
);

const decodeChallenge = Schema.decodeUnknownOption(
  Schema.Struct({ "WWW-Authenticate": Schema.String })
);

const unauthorized = (
  message: string,
  error?: "invalid_dpop_proof" | "invalid_token"
): APIError =>
  new APIError(
    "UNAUTHORIZED",
    error === undefined
      ? { message }
      : { error, error_description: message, message }
  );

// What a token that does not work becomes: the answer that tells the client
// how to get one that does, with the RFC 9728 challenge pointing at the
// resource's metadata.
const invalidFor =
  (resource: string) =>
  (error: APIError): AuthUnavailable | InvalidAccessToken => {
    const challenge = createResourceServerChallenge(error, resource);

    if (challenge === undefined) {
      return new AuthUnavailable({ cause: error });
    }

    return new InvalidAccessToken({
      challenge: decodeChallenge(challenge.headers).pipe(
        Option.match({
          onNone: () => "",
          onSome: (headers) => headers["WWW-Authenticate"],
        })
      ),
      description: challenge.message,
      status: challenge.statusCode === 403 ? 403 : 401,
    });
  };

/**
 * Checks OAuth access tokens the way Better Auth's MCP plugin does
 * (`requireMcpAuth`), against its signing keys read in process rather than
 * fetched from /api/auth/jwks over the public URL: the signature, issuer,
 * audience, expiry and client (`azp`, which only OAuth access tokens carry),
 * and the DPoP proof of tokens bound to the client's key, whose replays are
 * refused across servers through the database.
 */
export const makeAccessTokens = Effect.gen(function* makeAccessTokens() {
  const auth = yield* BetterAuth;
  const settings = yield* AuthSettings;

  const { internalAdapter } = yield* Effect.promise(
    async () => await auth.$context
  );

  const replayStore = createDpopReplayStore(internalAdapter);
  const issuer = issuerOf(settings.publicUrl);

  // Better Auth caches the keys under this object for five minutes, and
  // reads them again for a token signed with a key it does not know.
  const jwksCacheKey = {};

  const jwksFetch = async () => {
    try {
      return await auth.api.getJwks();
    } catch (error) {
      throw new AuthUnavailable({ cause: error });
    }
  };

  /**
   * The claims of a request's access token, issued for `resource`, decoded
   * with `claims`. A token whose claims do not match reads as invalid.
   */
  const verify = <A>(
    request: AccessTokenRequest,
    resource: string,
    requiredClaims: readonly string[],
    claims: Schema.Decoder<A>
  ): Effect.Effect<A, AuthUnavailable | InvalidAccessToken> =>
    Effect.gen(function* verifyToken() {
      const invalid = invalidFor(resource);

      const authorization = parseAccessTokenAuthorization(
        request.authorization.pipe(
          Option.map(Redacted.value),
          Option.getOrUndefined
        )
      );

      if (authorization === undefined || authorization.token === "") {
        return yield* invalid(unauthorized("missing authorization header"));
      }

      if (authorization.scheme === "Unknown") {
        return yield* invalid(
          unauthorized(
            "authorization scheme must be Bearer or DPoP",
            "invalid_token"
          )
        );
      }

      const payload = yield* Effect.tryPromise({
        catch: (cause) => {
          if (cause instanceof AuthUnavailable) {
            return cause;
          }

          const code = decodeCode(cause).pipe(
            Option.map((found) => found.code)
          );

          if (Option.exists(code, (value) => unavailableKeyCodes.has(value))) {
            return new AuthUnavailable({ cause });
          }

          return invalid(
            unauthorized(
              Option.contains(code, "ERR_JWT_EXPIRED")
                ? "token expired"
                : "invalid access token"
            )
          );
        },
        try: async () =>
          await verifyJwsAccessToken(authorization.token, {
            jwksCacheKey,
            jwksFetch,
            verifyOptions: {
              audience: resource,
              issuer,
              requiredClaims: [...requiredClaims],
            },
          }),
      });

      yield* Effect.tryPromise({
        catch: (cause) =>
          isDpopBindingError(cause)
            ? invalid(unauthorized(cause.message, cause.code))
            : new AuthUnavailable({ cause }),
        try: async () => {
          await enforceDpopBinding({
            authorization,
            method: request.method,
            payload,
            proofJwt: Option.getOrUndefined(request.dpopProof),
            replayStore,
            url: new URL(request.path, settings.publicUrl).href,
          });
        },
      });

      return yield* Schema.decodeUnknownEffect(claims)(payload).pipe(
        Effect.mapError(() => invalid(unauthorized("invalid access token")))
      );
    });

  return { verify };
});
