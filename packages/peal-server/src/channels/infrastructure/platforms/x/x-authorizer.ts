import { DateTime, Duration, Effect, Option, Redacted, Schema } from "effect";
import { HttpClientRequest } from "effect/http";
import type { HttpClientResponse } from "effect/http";

import { AuthorizationFailed } from "#channels/application/authorization-failed.ts";
import type {
  AuthorizedAccount,
  IssuedTokens,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { AvatarUrlSchema } from "#channels/domain/avatar-url.ts";
import { tokenPolicies } from "#channels/domain/token-policy.ts";
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

/** Where X's sign-in and API are. */
export interface XEndpoints {
  /** The API host, which also exchanges and refreshes tokens. */
  readonly api: URL;
  /** The page the account's owner signs in and agrees on. */
  readonly authorization: URL;
}

export const xEndpoints: XEndpoints = {
  api: new URL("https://api.x.com"),
  authorization: new URL("https://x.com/i/oauth2/authorize"),
};

export const xCallbackPath = "/connect/x/callback";

/**
 * What Peal asks an account for: to read and write posts (creating one
 * needs `tweet.read`, `tweet.write` and `users.read`), to upload media
 * (`media.write`), and `offline.access`, for a refresh token that renews
 * the two-hour access tokens without the user.
 */
export const xScopes: readonly string[] = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "media.write",
  "offline.access",
];

const UserSchema = Schema.Struct({
  data: Schema.Struct({
    id: Schema.NonEmptyString,
    name: Schema.optionalKey(Schema.String),
    profile_image_url: Schema.optionalKey(Schema.String),
    username: Schema.NonEmptyString,
  }),
});

const decodeAvatar = Schema.decodeUnknownOption(AvatarUrlSchema);

// Errors that name Peal's client rather than the account's tokens: the
// operator's settings are wrong, and no channel should be blamed for it.
const clientErrors: ReadonlySet<string> = new Set([
  "invalid_client",
  "unauthorized_client",
]);

// What a refused refresh means: the client's settings when X names the
// client, which only the operator can fix; otherwise the refresh token,
// revoked or spent, which only reconnecting replaces.
const refusedRefresh = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, PlatformUnavailable | TokenExpired> =>
  oauthErrorOf(response).pipe(
    Effect.flatMap(
      (code): Effect.Effect<never, PlatformUnavailable | TokenExpired> => {
        if (Option.exists(code, (name) => clientErrors.has(name))) {
          return Effect.logError(
            "X refused Peal's client: check X_CLIENT_ID and X_CLIENT_SECRET"
          ).pipe(Effect.andThen(Effect.fail(new PlatformUnavailable())));
        }

        return Effect.fail(new TokenExpired());
      }
    )
  );

const tokensOf = (
  answer: TokenAnswer,
  issuedAt: DateTime.Utc
): IssuedTokens => ({
  accessToken: Redacted.make(answer.access_token),
  expiresAt: Option.fromUndefinedOr(answer.expires_in).pipe(
    Option.filter((seconds) => seconds > 0),
    Option.map((seconds) =>
      DateTime.addDuration(issuedAt, Duration.seconds(seconds))
    )
  ),
  refreshToken: Option.fromUndefinedOr(answer.refresh_token).pipe(
    Option.map((token) => Redacted.make(token))
  ),
  renewable: answer.refresh_token !== undefined,
  scopes: scopesOf(answer, xScopes),
});

/**
 * An X account, through OAuth 2's authorization code flow with PKCE (S256),
 * as a confidential client: the token endpoint takes the client's id and
 * secret in a Basic Authorization header. Codes last 30 seconds, which the
 * web app's callback page leaves time for.
 *
 * Access tokens last two hours; the refresh token that comes with
 * `offline.access` works once, and each refresh answers with the next one.
 * A refresh is never sent twice: a retried one whose answer was lost would
 * spend the new token. The channels context refreshes under the channel's
 * lock and saves the answer before anything uses it.
 */
export const xAuthorizer = Effect.fn("XAuthorizer.make")(
  function* xAuthorizer(options: {
    readonly client: OAuthClient;
    readonly endpoints: XEndpoints;
    readonly http: AuthorizerHttp;
    readonly publicUrl: string;
  }) {
    const { client, endpoints, http } = options;
    const redirectUri = new URL(xCallbackPath, options.publicUrl).href;
    const tokenUrl = new URL("/2/oauth2/token", endpoints.api);
    const randomText = yield* randomTexts;
    const challengeOf = yield* pkceChallenges;

    const tokenRequest = (params: Readonly<Record<string, string>>) =>
      HttpClientRequest.post(tokenUrl).pipe(
        HttpClientRequest.basicAuth(client.clientId, client.clientSecret),
        HttpClientRequest.bodyUrlParams({
          ...params,
          client_id: client.clientId,
        })
      );

    const begin: PlatformAuthorizer["begin"] = () =>
      Effect.gen(function* beginning() {
        const verifier = Redacted.make(yield* randomText);
        const state = yield* randomText;
        const url = new URL(endpoints.authorization);

        url.search = new URLSearchParams({
          client_id: client.clientId,
          code_challenge: yield* challengeOf(verifier),
          code_challenge_method: "S256",
          redirect_uri: redirectUri,
          response_type: "code",
          scope: xScopes.join(" "),
          state,
        }).toString();

        return {
          authorizationUrl: url.href,
          instance: Option.none(),
          secret: verifier,
          state,
        };
      });

    const complete: PlatformAuthorizer["complete"] = ({ callback, secret }) =>
      Effect.gen(function* completing() {
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

        const { data: user } = yield* HttpClientRequest.get(
          new URL("/2/users/me", endpoints.api)
        ).pipe(
          HttpClientRequest.setUrlParam("user.fields", "profile_image_url"),
          HttpClientRequest.bearerToken(token.access_token),
          http.execute,
          Effect.flatMap(bodyOf("Reading the account", UserSchema)),
          exchanged
        );

        const authorized: AuthorizedAccount = {
          accountId: user.id,
          avatarUrl: Option.fromUndefinedOr(user.profile_image_url).pipe(
            Option.flatMap(decodeAvatar)
          ),
          displayName: Option.fromUndefinedOr(user.name).pipe(
            Option.filter((name) => name.trim() !== "")
          ),
          handle: `@${user.username}`,
          tokens: tokensOf(token, issuedAt),
        };

        return authorized;
      });

    const refresh: PlatformAuthorizer["refresh"] = (_channel, tokens) =>
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
            OutboundRequestRefused: () =>
              Effect.fail(new PlatformUnavailable()),
          })
        );

        if (response.status >= 500 || response.status === 429) {
          return yield* new PlatformUnavailable();
        }

        // The app's credits are used up: the operator's to fix, never the
        // account's, so the channel keeps its refresh token.
        if (response.status === 402) {
          return yield* Effect.logError(
            "X refuses this server's app until its account is paid for: add credits or raise its spending cap in X's developer console"
          ).pipe(Effect.andThen(Effect.fail(new PlatformUnavailable())));
        }

        if (response.status !== 200) {
          return yield* refusedRefresh(response);
        }

        // The old refresh token no longer works: an answer that cannot be read
        // loses the session, and the channel must be reconnected.
        const answer = yield* bodyOf(
          "The refresh",
          TokenAnswerSchema
        )(response).pipe(Effect.mapError(() => new TokenExpired()));

        return tokensOf(answer, issuedAt);
      });

    const authorizer: PlatformAuthorizer = {
      begin,
      complete,
      platform: "x",
      policy: tokenPolicies.x,
      refresh,
    };

    return authorizer;
  }
);
