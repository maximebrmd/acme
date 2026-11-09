import { DateTime, Duration, Effect, Option, Redacted, Schema } from "effect";
import { HttpClientRequest } from "effect/http";
import type { HttpClientResponse } from "effect/http";

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

/** Where Google's sign-in and the YouTube Data API are. */
export interface YouTubeEndpoints {
  /** The YouTube Data API's host, which lists the signed-in channel. */
  readonly api: URL;
  /** The page the account's owner picks an account and agrees on. */
  readonly authorization: URL;
  /** Where tokens are revoked. */
  readonly revocation: URL;
  /** Where codes are exchanged and tokens refreshed. */
  readonly token: URL;
}

export const youtubeEndpoints: YouTubeEndpoints = {
  api: new URL("https://www.googleapis.com"),
  authorization: new URL("https://accounts.google.com/o/oauth2/v2/auth"),
  revocation: new URL("https://oauth2.googleapis.com/revoke"),
  token: new URL("https://oauth2.googleapis.com/token"),
};

export const youtubeCallbackPath = "/connect/youtube/callback";

const scope = (name: string) => `https://www.googleapis.com/auth/${name}`;

/**
 * What Acme asks a Google account for, the narrowest scopes that do it:
 * `youtube.upload`, to upload videos (videos.insert), and
 * `youtube.readonly`, to read the channel it signed in as (channels.list),
 * its videos' processing and their statistics (videos.list), private ones
 * included. Neither lets Acme change or delete anything else.
 */
export const youtubeScopes: readonly string[] = [
  scope("youtube.upload"),
  scope("youtube.readonly"),
];

// What each permission Acme needs is granted by, as Google names the
// scopes: its own, or a broader one the account granted instead.
const neededScopes: readonly (readonly string[])[] = [
  [scope("youtube.upload"), scope("youtube"), scope("youtube.force-ssl")],
  [scope("youtube.readonly"), scope("youtube"), scope("youtube.force-ssl")],
];

// A channel, as channels.list shows it with part=snippet.
const ChannelSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  snippet: Schema.Struct({
    customUrl: Schema.optionalKey(Schema.String),
    thumbnails: Schema.optionalKey(
      Schema.Struct({
        default: Schema.optionalKey(Schema.Struct({ url: Schema.String })),
      })
    ),
    title: Schema.String,
  }),
});

const ChannelsSchema = Schema.Struct({
  items: Schema.optionalKey(Schema.Array(ChannelSchema)),
});

type YouTubeChannel = typeof ChannelSchema.Type;

const decodeAvatar = Schema.decodeUnknownOption(AvatarUrlSchema);

// Errors that name Acme's client rather than the account's tokens: the
// operator's settings are wrong, and no channel should be blamed for it.
const clientErrors: ReadonlySet<string> = new Set([
  "invalid_client",
  "unauthorized_client",
]);

// What a refused refresh means: the client's settings when Google names the
// client, which only the operator can fix; otherwise the refresh token,
// revoked, unused six months, or past the seven days of a project in
// testing, which only reconnecting replaces.
const refusedRefresh = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, PlatformUnavailable | TokenExpired> =>
  oauthErrorOf(response).pipe(
    Effect.flatMap(
      (code): Effect.Effect<never, PlatformUnavailable | TokenExpired> => {
        if (Option.exists(code, (name) => clientErrors.has(name))) {
          return Effect.logError(
            "Google refused Acme's client: check YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET"
          ).pipe(Effect.andThen(Effect.fail(new PlatformUnavailable())));
        }

        return Effect.fail(new TokenExpired());
      }
    )
  );

const expiryOf = (answer: TokenAnswer, issuedAt: DateTime.Utc) =>
  Option.fromUndefinedOr(answer.expires_in).pipe(
    Option.filter((seconds) => seconds > 0),
    Option.map((seconds) =>
      DateTime.addDuration(issuedAt, Duration.seconds(seconds))
    )
  );

// The name people know the channel by: its handle (`@name`), or its title
// for a channel without one.
const handleOf = (channel: YouTubeChannel): string => {
  const custom = channel.snippet.customUrl?.trim() ?? "";

  if (custom !== "") {
    return custom.startsWith("@") ? custom : `@${custom}`;
  }

  const title = channel.snippet.title.trim();

  return title === "" ? channel.id : title;
};

const accountOf = (
  channel: YouTubeChannel,
  tokens: IssuedTokens
): AuthorizedAccount => ({
  accountId: channel.id,
  avatarUrl: Option.fromUndefinedOr(
    channel.snippet.thumbnails?.default?.url
  ).pipe(Option.flatMap(decodeAvatar)),
  displayName: Option.some(channel.snippet.title.trim()).pipe(
    Option.filter((title) => title !== "")
  ),
  handle: handleOf(channel),
  tokens,
});

/**
 * A YouTube channel, through Google's OAuth 2.0 for web server
 * applications, with PKCE (S256), as a confidential client: the token
 * endpoint takes the client's id and secret in the form. `access_type`
 * offline asks for a refresh token, and `prompt` consent makes Google give
 * one at every sign-in, with the account chooser first: an owner of brand
 * accounts picks the channel there, and the token is that channel's.
 * Granular consent lets the owner untick a scope: a sign-in that withheld
 * one Acme needs is refused.
 *
 * Access tokens last an hour. Refresh tokens do not rotate: a refresh
 * answers an access token, and a new refresh token only rarely, which then
 * replaces the old one. A Google project in testing gets refresh tokens
 * that expire after seven days, whose channels then need reconnecting.
 * Disconnecting a channel revokes its tokens at Google.
 */
export const youtubeAuthorizer = Effect.fn("YouTubeAuthorizer.make")(
  function* youtubeAuthorizer(options: {
    readonly client: OAuthClient;
    readonly endpoints: YouTubeEndpoints;
    readonly http: AuthorizerHttp;
    readonly publicUrl: string;
  }) {
    const { client, endpoints, http } = options;
    const redirectUri = new URL(youtubeCallbackPath, options.publicUrl).href;
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
          scope: youtubeScopes.join(" "),
          state,
        }).toString();

        return {
          authorizationUrl: url.href,
          instance: Option.none(),
          secret: verifier,
          state,
        };
      });

    // The channels the token signs in as: one, the account the owner
    // picked; none when that Google account has no channel.
    const channelsOf = (accessToken: string) =>
      HttpClientRequest.get(
        new URL("/youtube/v3/channels", endpoints.api)
      ).pipe(
        HttpClientRequest.setUrlParams({
          maxResults: "50",
          mine: "true",
          part: "snippet",
        }),
        HttpClientRequest.bearerToken(accessToken),
        http.execute,
        Effect.flatMap(bodyOf("Reading the channel", ChannelsSchema)),
        exchanged,
        Effect.map(({ items }) => items ?? [])
      );

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

        const granted = scopesOf(token, []);

        if (
          !neededScopes.every((any) =>
            any.some((name) => granted.includes(name))
          )
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

        const channels = yield* channelsOf(token.access_token);

        return {
          _tag: "choice" as const,
          accounts: channels.map((channel) => accountOf(channel, tokens)),
        };
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
            OutboundRequestRefused: () =>
              Effect.fail(new PlatformUnavailable()),
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

    const authorizer: PlatformAuthorizer = {
      begin,
      complete,
      platform: "youtube",
      policy: tokenPolicies.youtube,
      refresh,
      revoke,
    };

    return authorizer;
  }
);
