import { DateTime, Duration, Effect, Option, Redacted, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { AuthorizationFailed } from "#channels/application/authorization-failed.ts";
import type {
  AuthorizedAccount,
  IssuedTokens,
  PlatformAuthorizer,
  StoredTokens,
} from "#channels/application/platform-authorizer.ts";
import { AvatarUrlSchema } from "#channels/domain/avatar-url.ts";
import { tokenPolicies } from "#channels/domain/token-policy.ts";
import type { OAuthClient } from "#channels/infrastructure/platforms/oauth-client.ts";
import {
  bodyOf,
  exchanged,
  OAuthErrorSchema,
  randomTexts,
} from "#channels/infrastructure/platforms/oauth-exchange.ts";
import type { AuthorizerHttp } from "#channels/infrastructure/platforms/oauth-exchange.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { tiktokAnswer } from "#shared/infrastructure/platforms/tiktok-api.ts";
import type { TikTokHosts } from "#shared/infrastructure/platforms/tiktok-api.ts";

export const tiktokCallbackPath = "/connect/tiktok/callback";

/**
 * What Acme asks a creator for: who they are (`user.info.basic`, which
 * every Login Kit app has, and `user.info.profile` for their username), to
 * post on their account (`video.publish`, the Content Posting API's direct
 * post, photos included), and to read their videos (`video.list`, the
 * Display API), whose counts analytics follows. The creator may turn the
 * last one off on TikTok's page: the channel then posts without analytics.
 */
export const tiktokScopes: readonly string[] = [
  "user.info.basic",
  "user.info.profile",
  "video.publish",
  "video.list",
];

/**
 * TikTok's token answer (Get and Refresh a User Access Token): `open_id`
 * names the creator for this app, and `scope` lists, comma-separated, what
 * they allowed.
 */
const TikTokTokenSchema = Schema.Struct({
  access_token: Schema.NonEmptyString,
  expires_in: Schema.optionalKey(Schema.Number),
  open_id: Schema.NonEmptyString,
  refresh_token: Schema.optionalKey(Schema.NonEmptyString),
  scope: Schema.optionalKey(Schema.String),
});

type TikTokToken = typeof TikTokTokenSchema.Type;

const UserSchema = tiktokAnswer(
  Schema.Struct({
    user: Schema.Struct({
      avatar_url: Schema.optionalKey(Schema.String),
      display_name: Schema.optionalKey(Schema.String),
      open_id: Schema.optionalKey(Schema.String),
      username: Schema.optionalKey(Schema.String),
    }),
  })
);

const decodeAvatar = Schema.decodeUnknownOption(AvatarUrlSchema);

const decodeOAuthError = Schema.decodeUnknownOption(OAuthErrorSchema);

// Errors that name Acme's client rather than the creator's tokens: the
// operator's settings are wrong, and no channel should be blamed for it.
const clientErrors: ReadonlySet<string> = new Set([
  "invalid_client",
  "unauthorized_client",
]);

// The user fields Acme reads, as GET /v2/user/info/ takes them.
const userFields = "open_id,avatar_url,display_name,username";

const nonBlank = (text: string | undefined) =>
  Option.fromUndefinedOr(text).pipe(
    Option.map((value) => value.trim()),
    Option.filter((value) => value !== "")
  );

// What the creator granted, as TikTok lists them: comma-separated. None
// listed, the scopes asked for.
const scopesOf = (token: TikTokToken): readonly string[] => {
  const granted = (token.scope ?? "")
    .split(/[\s,]+/u)
    .filter((scope) => scope !== "");

  return granted.length > 0 ? granted : tiktokScopes;
};

const tokensOf = (
  token: TikTokToken,
  issuedAt: DateTime.Utc
): IssuedTokens => ({
  accessToken: Redacted.make(token.access_token),
  expiresAt: Option.fromUndefinedOr(token.expires_in).pipe(
    Option.filter((seconds) => seconds > 0),
    Option.map((seconds) =>
      DateTime.addDuration(issuedAt, Duration.seconds(seconds))
    )
  ),
  refreshToken: Option.fromUndefinedOr(token.refresh_token).pipe(
    Option.map((refresh) => Redacted.make(refresh))
  ),
  renewable: token.refresh_token !== undefined,
  scopes: scopesOf(token),
});

// TikTok may answer an OAuth error with any status, 200 included: an
// answer that names an error is a refusal, whatever its status.
const oauthErrorIn = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<Option.Option<string>> =>
  response.json.pipe(
    Effect.map((body) =>
      decodeOAuthError(body).pipe(
        Option.flatMap(({ error }) => Option.fromUndefinedOr(error)),
        Option.filter((error) => error !== "")
      )
    ),
    Effect.orElseSucceed(() => Option.none<string>())
  );

// A token answer: the platform down for a server error or a rate limit,
// its refusal for an error it names.
const tokenAnswer =
  (what: string) =>
  (
    response: HttpClientResponse.HttpClientResponse
  ): Effect.Effect<TikTokToken, AuthorizationFailed | PlatformUnavailable> =>
    oauthErrorIn(response).pipe(
      Effect.flatMap((named) =>
        Option.isSome(named) && response.status < 500
          ? Effect.fail(
              new AuthorizationFailed({
                reason: `${what} answered ${response.status} (${named.value.slice(0, 64)})`,
              })
            )
          : bodyOf(what, TikTokTokenSchema)(response)
      )
    );

// What a refused refresh means: the client's settings when TikTok names
// the client, which only the operator can fix; otherwise the refresh token,
// revoked, spent or past its 180 days, which only reconnecting replaces.
const refusedRefresh = (
  error: Option.Option<string>
): Effect.Effect<never, PlatformUnavailable | TokenExpired> => {
  if (Option.exists(error, (name) => clientErrors.has(name))) {
    return Effect.logError(
      "TikTok refused Acme's client: check TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET"
    ).pipe(Effect.andThen(Effect.fail(new PlatformUnavailable())));
  }

  if (
    Option.exists(error, (name) =>
      ["server_error", "temporarily_unavailable"].includes(name)
    )
  ) {
    return Effect.fail(new PlatformUnavailable());
  }

  return Effect.fail(new TokenExpired());
};

/**
 * A TikTok creator's account, through Login Kit for Web: OAuth 2's
 * authorization code flow as a confidential client, whose key and secret
 * go in the token request's form. TikTok's web flow takes no PKCE (it asks
 * for it from desktop and mobile apps only), so the state, bound to the
 * workspace and the member by ConnectChannel, guards the callback.
 *
 * Access tokens last as `expires_in` says (two hours in TikTok's guide, a
 * day in its examples); each refresh answers with a new refresh token and
 * the old one stops working at once. A refresh is never sent twice: the
 * channels context refreshes under the channel's lock and saves the answer
 * before anything uses it. Refresh tokens end 180 days after the creator
 * signed in, when the channel asks to be reconnected.
 *
 * Disconnecting revokes the access token, which removes Acme from the
 * creator's connected apps.
 */
export const tiktokAuthorizer = Effect.fn("TikTokAuthorizer.make")(
  function* tiktokAuthorizer(options: {
    readonly client: OAuthClient;
    readonly hosts: TikTokHosts;
    readonly http: AuthorizerHttp;
    readonly publicUrl: string;
  }) {
    const { client, hosts, http } = options;
    const redirectUri = new URL(tiktokCallbackPath, options.publicUrl).href;
    const tokenUrl = new URL("/v2/oauth/token/", hosts.api);
    const randomText = yield* randomTexts;

    const clientParams = () => ({
      client_key: client.clientId,
      client_secret: Redacted.value(client.clientSecret),
    });

    const begin: PlatformAuthorizer["begin"] = () =>
      Effect.gen(function* beginning() {
        const state = yield* randomText;
        const url = new URL(hosts.authorization);

        url.search = new URLSearchParams({
          client_key: client.clientId,
          // Always shows the consent page, so the creator sees which
          // account they connect, and may switch.
          disable_auto_auth: "1",
          redirect_uri: redirectUri,
          response_type: "code",
          scope: tiktokScopes.join(","),
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

        const token = yield* HttpClientRequest.post(tokenUrl).pipe(
          HttpClientRequest.bodyUrlParams({
            ...clientParams(),
            code: callback.code.value,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
          http.execute,
          Effect.flatMap(tokenAnswer("The token exchange")),
          exchanged
        );

        const answer = yield* HttpClientRequest.get(
          new URL("/v2/user/info/", hosts.api)
        ).pipe(
          HttpClientRequest.setUrlParam("fields", userFields),
          HttpClientRequest.bearerToken(token.access_token),
          http.execute,
          Effect.flatMap(bodyOf("Reading the creator", UserSchema)),
          exchanged
        );

        if (answer.data === undefined) {
          return yield* new AuthorizationFailed({
            reason: `Reading the creator answered ${answer.error?.code.slice(0, 64) ?? "nothing"}`,
          });
        }

        const { user } = answer.data;
        const displayName = nonBlank(user.display_name);

        const authorized: AuthorizedAccount = {
          accountId: token.open_id,
          avatarUrl: nonBlank(user.avatar_url).pipe(
            Option.flatMap(decodeAvatar)
          ),
          displayName,
          // Without the username, which `user.info.profile` gives, the name
          // the creator shows stands for it.
          handle: nonBlank(user.username).pipe(
            Option.map((username) => `@${username}`),
            Option.orElse(() => displayName),
            Option.getOrElse(() => "TikTok creator")
          ),
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

        const response = yield* HttpClientRequest.post(tokenUrl).pipe(
          HttpClientRequest.bodyUrlParams({
            ...clientParams(),
            grant_type: "refresh_token",
            refresh_token: Redacted.value(tokens.refreshToken.value),
          }),
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

        const error = yield* oauthErrorIn(response);

        if (response.status !== 200 || Option.isSome(error)) {
          return yield* refusedRefresh(error);
        }

        // The old refresh token no longer works: an answer that cannot be
        // read loses the session, and the channel must be reconnected.
        const answer = yield* HttpClientResponse.schemaBodyJson(
          TikTokTokenSchema
        )(response).pipe(Effect.mapError(() => new TokenExpired()));

        return tokensOf(answer, issuedAt);
      });

    // Revokes the creator's grant, which ends every token of it. A token
    // TikTok no longer knows is as good as revoked.
    const revoke = (tokens: StoredTokens) =>
      HttpClientRequest.post(new URL("/v2/oauth/revoke/", hosts.api)).pipe(
        HttpClientRequest.bodyUrlParams({
          ...clientParams(),
          token: Redacted.value(tokens.accessToken),
        }),
        http.execute,
        Effect.flatMap((response) =>
          response.status >= 500 || response.status === 429
            ? Effect.fail(new PlatformUnavailable())
            : oauthErrorIn(response).pipe(
                Effect.flatMap((named) =>
                  Option.exists(named, (name) => clientErrors.has(name))
                    ? Effect.fail(new PlatformUnavailable())
                    : Effect.void
                )
              )
        ),
        Effect.catchTags({
          HttpClientError: () => Effect.fail(new PlatformUnavailable()),
          OutboundRequestRefused: () => Effect.fail(new PlatformUnavailable()),
        })
      );

    const authorizer: PlatformAuthorizer = {
      begin,
      complete,
      platform: "tiktok",
      policy: tokenPolicies.tiktok,
      refresh,
      revoke,
    };

    return authorizer;
  }
);
