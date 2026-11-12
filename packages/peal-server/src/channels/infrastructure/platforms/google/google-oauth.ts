import { DateTime, Duration, Effect, Option, Redacted } from "effect";
import { HttpClientRequest } from "effect/http";
import type { HttpClientResponse } from "effect/http";

import { AuthorizationDenied } from "#channels/application/authorization-denied.ts";
import { AuthorizationFailed } from "#channels/application/authorization-failed.ts";
import type {
  IssuedTokens,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import type { OAuthClient } from "#channels/infrastructure/platforms/oauth-client.ts";
import {
  bodyOf,
  exchanged,
  oauthErrorOf,
  pkceChallenges,
  randomTexts,
  scopesOf,
  TokenAnswerSchema,
} from "#channels/infrastructure/platforms/oauth-exchange.ts";
import type {
  AuthorizerHttp,
  TokenAnswer,
} from "#channels/infrastructure/platforms/oauth-exchange.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";

/** Where Google's sign-in is. */
export interface GoogleOAuthEndpoints {
  /** The page the account's owner picks an account and agrees on. */
  readonly authorization: URL;
  /** Where tokens are revoked. */
  readonly revocation: URL;
  /** Where codes are exchanged and tokens refreshed. */
  readonly token: URL;
}

export const googleOAuthEndpoints: GoogleOAuthEndpoints = {
  authorization: new URL("https://accounts.google.com/o/oauth2/v2/auth"),
  revocation: new URL("https://oauth2.googleapis.com/revoke"),
  token: new URL("https://oauth2.googleapis.com/token"),
};

/** A Google API scope, as Google names it. */
export const googleScope = (name: string) =>
  `https://www.googleapis.com/auth/${name}`;

// Errors that name Peal's client rather than the account's tokens: the
// operator's settings are wrong, and no channel should be blamed for it.
const clientErrors: ReadonlySet<string> = new Set([
  "invalid_client",
  "unauthorized_client",
]);

const expiryOf = (answer: TokenAnswer, issuedAt: DateTime.Utc) =>
  Option.fromUndefinedOr(answer.expires_in).pipe(
    Option.filter((seconds) => seconds > 0),
    Option.map((seconds) =>
      DateTime.addDuration(issuedAt, Duration.seconds(seconds))
    )
  );

/** What a Google sign-in for one of its products asks and needs. */
export interface GoogleOAuthOptions {
  readonly client: OAuthClient;
  readonly endpoints: GoogleOAuthEndpoints;
  readonly http: AuthorizerHttp;
  /**
   * What each permission Peal needs is granted by, as Google names the
   * scopes: its own, or a broader one the account granted instead.
   */
  readonly needed: readonly (readonly string[])[];
  /**
   * Scopes the consent page asks for after `scopes`, which Peal does not
   * need to connect: an owner who unticks one still connects, and the
   * channel holds what Google says was granted. None unless given.
   */
  readonly optionalScopes?: readonly string[];
  /** Where Google sends the owner back, registered on the client. */
  readonly redirectUri: string;
  /** The scopes the consent page asks for. */
  readonly scopes: readonly string[];
  /** The settings that hold the client, for the operator's log. */
  readonly settings: string;
}

/**
 * Google's OAuth 2.0 for web server applications, with PKCE (S256), as a
 * confidential client: the token endpoint takes the client's id and secret
 * in the form. `access_type` offline asks for a refresh token, and `prompt`
 * consent makes Google give one at every sign-in, with the account chooser
 * first. Granular consent lets the owner untick a scope: a sign-in that
 * withheld one Peal needs is refused, and one that withheld an optional
 * scope connects without it. Peal asks for everything each time and never
 * sends `include_granted_scopes`, so a reconnection records what that
 * consent granted, not what an earlier one did.
 *
 * Access tokens last an hour. Refresh tokens do not rotate: a refresh
 * answers an access token, and a new refresh token only rarely, which then
 * replaces the old one. A Google project in testing gets refresh tokens
 * that expire after seven days, whose channels then need reconnecting.
 * Each Google product Peal connects (YouTube, Business Profile) builds its
 * authorizer on this, with its own client, scopes and accounts.
 */
export const googleOAuth = Effect.fn("GoogleOAuth.make")(function* googleOAuth(
  options: GoogleOAuthOptions
) {
  const { client, endpoints, http, redirectUri } = options;
  const randomText = yield* randomTexts;
  const challengeOf = yield* pkceChallenges;

  const tokenRequest = (params: Readonly<Record<string, string>>) =>
    HttpClientRequest.post(endpoints.token).pipe(
      HttpClientRequest.bodyUrlParams({
        ...params,
        client_id: client.clientId,
        client_secret: Redacted.value(client.clientSecret),
      })
    );

  // What a refused refresh means: the client's settings when Google names
  // the client, which only the operator can fix; otherwise the refresh
  // token, revoked, unused six months, or past the seven days of a project
  // in testing, which only reconnecting replaces.
  const refusedRefresh = (
    response: HttpClientResponse.HttpClientResponse
  ): Effect.Effect<never, PlatformUnavailable | TokenExpired> =>
    oauthErrorOf(response).pipe(
      Effect.flatMap(
        (code): Effect.Effect<never, PlatformUnavailable | TokenExpired> => {
          if (Option.exists(code, (name) => clientErrors.has(name))) {
            return Effect.logError(
              `Google refused Peal's client: check ${options.settings}`
            ).pipe(Effect.andThen(Effect.fail(new PlatformUnavailable())));
          }

          return Effect.fail(new TokenExpired());
        }
      )
    );

  const begin: PlatformAuthorizer["begin"] = () =>
    Effect.gen(function* beginning() {
      const verifier = Redacted.make(yield* randomText);
      const state = yield* randomText;
      const url = new URL(endpoints.authorization);

      url.search = new URLSearchParams({
        access_type: "offline",
        client_id: client.clientId,
        code_challenge: yield* challengeOf(verifier),
        code_challenge_method: "S256",
        prompt: "select_account consent",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: [...options.scopes, ...(options.optionalScopes ?? [])].join(" "),
        state,
      }).toString();

      return {
        authorizationUrl: url.href,
        instance: Option.none(),
        secret: verifier,
        state,
      };
    });

  /**
   * Exchanges the callback's code for the grant's tokens: refused when the
   * owner withheld a scope Peal needs, failed without a refresh token.
   */
  const exchange = Effect.fn("GoogleOAuth.exchange")(function* exchange({
    callback,
    secret,
  }: Pick<
    Parameters<PlatformAuthorizer["complete"]>[0],
    "callback" | "secret"
  >) {
    if (Option.isNone(callback.code)) {
      return yield* new AuthorizationFailed({
        reason: "the callback has no code",
      });
    }

    const issuedAt = yield* DateTime.now;

    const token = yield* tokenRequest({
      code: callback.code.value,
      code_verifier: Redacted.value(secret),
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).pipe(
      http.execute,
      Effect.flatMap(bodyOf("The token exchange", TokenAnswerSchema)),
      exchanged
    );

    const granted = scopesOf(token, []);

    if (
      !options.needed.every((any) => any.some((name) => granted.includes(name)))
    ) {
      return yield* new AuthorizationDenied();
    }

    if (token.refresh_token === undefined) {
      return yield* new AuthorizationFailed({
        reason: "Google gave no refresh token",
      });
    }

    const tokens: IssuedTokens = {
      accessToken: Redacted.make(token.access_token),
      expiresAt: expiryOf(token, issuedAt),
      refreshToken: Option.some(Redacted.make(token.refresh_token)),
      renewable: true,
      scopes: granted,
    };

    return tokens;
  });

  const refresh: PlatformAuthorizer["refresh"] = (channel, tokens) =>
    Effect.gen(function* refreshing() {
      if (Option.isNone(tokens.refreshToken)) {
        return yield* new TokenExpired();
      }

      const issuedAt = yield* DateTime.now;

      const response = yield* tokenRequest({
        grant_type: "refresh_token",
        refresh_token: Redacted.value(tokens.refreshToken.value),
      }).pipe(
        http.execute,
        Effect.catchTags({
          HttpClientError: () => Effect.fail(new PlatformUnavailable()),
          OutboundRequestRefused: () => Effect.fail(new PlatformUnavailable()),
        })
      );

      if (response.status >= 500 || response.status === 429) {
        return yield* new PlatformUnavailable();
      }

      if (response.status !== 200) {
        return yield* refusedRefresh(response);
      }

      // The refresh token still works: an answer that cannot be read is
      // tried again later.
      const answer = yield* bodyOf(
        "The refresh",
        TokenAnswerSchema
      )(response).pipe(Effect.mapError(() => new PlatformUnavailable()));

      const renewed: IssuedTokens = {
        accessToken: Redacted.make(answer.access_token),
        expiresAt: expiryOf(answer, issuedAt),
        refreshToken: Option.fromUndefinedOr(answer.refresh_token).pipe(
          Option.map((token) => Redacted.make(token)),
          Option.orElse(() => tokens.refreshToken)
        ),
        renewable: true,
        scopes: scopesOf(answer, channel.scopes),
      };

      return renewed;
    });

  // Revoking the refresh token ends the whole grant, its access tokens
  // included. Google answers 400 to a token it no longer knows.
  const revoke: NonNullable<PlatformAuthorizer["revoke"]> = (tokens) =>
    HttpClientRequest.post(endpoints.revocation).pipe(
      HttpClientRequest.bodyUrlParams({
        token: Redacted.value(
          Option.getOrElse(tokens.refreshToken, () => tokens.accessToken)
        ),
      }),
      http.execute,
      Effect.catchTags({
        HttpClientError: () => Effect.fail(new PlatformUnavailable()),
        OutboundRequestRefused: () => Effect.fail(new PlatformUnavailable()),
      }),
      Effect.flatMap((response) =>
        response.status === 200 || response.status === 400
          ? Effect.void
          : Effect.fail(new PlatformUnavailable())
      )
    );

  return { begin, exchange, refresh, revoke };
});
