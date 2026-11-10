import { DateTime, Duration, Effect, Option, Redacted, Schema } from "effect";
import { HttpClientRequest } from "effect/http";

import { AuthorizationDenied } from "#channels/application/authorization-denied.ts";
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
import type { PinterestHosts } from "#shared/infrastructure/platforms/pinterest-api.ts";

export const pinterestCallbackPath = "/connect/pinterest/callback";

/**
 * What Peal asks an account for, as Pinterest's API description lists each
 * operation's scopes: creating a Pin needs `boards:read`, `boards:write`,
 * `pins:read` and `pins:write`; registering a video and reading its
 * processing, `pins:read` and `pins:write`; listing boards and their
 * sections, `boards:read`; a Pin's analytics, `boards:read` and
 * `pins:read`; and the account itself, `user_accounts:read`. The scopes of
 * secret boards and Pins are not asked for, so Peal never sees them.
 */
export const pinterestScopes: readonly string[] = [
  "boards:read",
  "boards:write",
  "pins:read",
  "pins:write",
  "user_accounts:read",
];

// The account, as GET /v5/user_account shows it.
const AccountSchema = Schema.Struct({
  business_name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  id: Schema.NonEmptyString,
  profile_image: Schema.optionalKey(Schema.NullOr(Schema.String)),
  username: Schema.NonEmptyString,
});

const decodeAvatar = Schema.decodeUnknownOption(AvatarUrlSchema);

const tokensOf = (
  answer: TokenAnswer,
  issuedAt: DateTime.Utc,
  previous: Option.Option<Redacted.Redacted>
): IssuedTokens => {
  const refreshToken = Option.fromUndefinedOr(answer.refresh_token).pipe(
    Option.map((token) => Redacted.make(token)),
    Option.orElse(() => previous)
  );

  return {
    accessToken: Redacted.make(answer.access_token),
    expiresAt: Option.fromUndefinedOr(answer.expires_in).pipe(
      Option.filter((seconds) => seconds > 0),
      Option.map((seconds) =>
        DateTime.addDuration(issuedAt, Duration.seconds(seconds))
      )
    ),
    refreshToken,
    renewable: Option.isSome(refreshToken),
    scopes: scopesOf(answer, pinterestScopes),
  };
};

/**
 * A Pinterest account, through OAuth 2's authorization code flow as
 * Pinterest's "Set up authentication and authorization" guide gives it:
 * the app's id and secret go to the token endpoint as Basic credentials,
 * and scopes are separated by commas. The guide names no PKCE, so the
 * state, bound to the workspace and the member by ConnectChannel, guards
 * the callback.
 *
 * Access tokens last 30 days. The refresh token that comes with them (a
 * continuous refresh token, the only kind Pinterest issues to apps made
 * since 25 September 2025; `continuous_refresh` asks older apps' for it)
 * lasts 60 days, and each refresh answers a new access token and a refresh
 * token good for 60 days more, so an account Peal keeps renewing never has
 * to sign in again. Pinterest does not say whether the refresh token sent
 * still works after its answer: the answer's replaces it, and the channels
 * context refreshes under the channel's lock and saves it before anything
 * uses it.
 *
 * Pinterest revokes tokens through its API for system users only, so a
 * disconnected channel's grant stays until its owner removes Peal in
 * Pinterest's settings, or its tokens run out.
 */
export const pinterestAuthorizer = Effect.fn("PinterestAuthorizer.make")(
  function* pinterestAuthorizer(options: {
    readonly client: OAuthClient;
    readonly hosts: PinterestHosts;
    readonly http: AuthorizerHttp;
    readonly publicUrl: string;
  }) {
    const { client, hosts, http } = options;
    const redirectUri = new URL(pinterestCallbackPath, options.publicUrl).href;
    const tokenUrl = new URL("/v5/oauth/token", hosts.api);
    const randomText = yield* randomTexts;

    const tokenRequest = (params: Readonly<Record<string, string>>) =>
      HttpClientRequest.post(tokenUrl).pipe(
        HttpClientRequest.basicAuth(client.clientId, client.clientSecret),
        HttpClientRequest.bodyUrlParams(params)
      );

    const begin: PlatformAuthorizer["begin"] = () =>
      Effect.gen(function* beginning() {
        const state = yield* randomText;
        const url = new URL(hosts.authorization);

        url.search = new URLSearchParams({
          client_id: client.clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: pinterestScopes.join(","),
          state,
        }).toString();

        return {
          authorizationUrl: url.href,
          instance: Option.none(),
          // Without PKCE, completing the sign-in needs nothing kept.
          secret: Redacted.make(""),
          state,
        };
      });

    const complete: PlatformAuthorizer["complete"] = ({ callback }) =>
      Effect.gen(function* completing() {
        if (Option.isNone(callback.code)) {
          return yield* new AuthorizationFailed({
            reason: "the callback has no code",
          });
        }

        const issuedAt = yield* DateTime.now;

        const token = yield* tokenRequest({
          code: callback.code.value,
          continuous_refresh: "true",
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }).pipe(
          http.execute,
          Effect.flatMap(bodyOf("The token exchange", TokenAnswerSchema)),
          exchanged
        );

        const tokens = tokensOf(token, issuedAt, Option.none());

        if (!pinterestScopes.every((scope) => tokens.scopes.includes(scope))) {
          return yield* new AuthorizationDenied();
        }

        const account = yield* HttpClientRequest.get(
          new URL("/v5/user_account", hosts.api)
        ).pipe(
          HttpClientRequest.bearerToken(token.access_token),
          http.execute,
          Effect.flatMap(bodyOf("Reading the account", AccountSchema)),
          exchanged
        );

        const authorized: AuthorizedAccount = {
          accountId: account.id,
          avatarUrl: Option.fromNullishOr(account.profile_image).pipe(
            Option.flatMap(decodeAvatar)
          ),
          displayName: Option.fromNullishOr(account.business_name).pipe(
            Option.map((name) => name.trim()),
            Option.filter((name) => name !== "")
          ),
          handle: `@${account.username}`,
          tokens,
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

        // The token endpoint authenticates the app, by its Basic
        // credentials: a 401 refuses them, which only the operator can
        // fix, so the channel keeps its refresh token.
        if (response.status === 401) {
          return yield* Effect.logError(
            "Pinterest refused Peal's app: check PINTEREST_APP_ID and PINTEREST_APP_SECRET"
          ).pipe(Effect.andThen(Effect.fail(new PlatformUnavailable())));
        }

        // Any other refusal is of the refresh token: revoked, or past its
        // 60 days, which only reconnecting replaces.
        if (response.status !== 200 && response.status !== 201) {
          return yield* new TokenExpired();
        }

        // Whether the refresh token sent still works is not known: an
        // answer that cannot be read is tried again later, and a token
        // that no longer works is then refused.
        const answer = yield* bodyOf(
          "The refresh",
          TokenAnswerSchema
        )(response).pipe(Effect.mapError(() => new PlatformUnavailable()));

        return tokensOf(answer, issuedAt, tokens.refreshToken);
      });

    const authorizer: PlatformAuthorizer = {
      begin,
      complete,
      platform: "pinterest",
      policy: tokenPolicies.pinterest,
      refresh,
    };

    return authorizer;
  }
);
