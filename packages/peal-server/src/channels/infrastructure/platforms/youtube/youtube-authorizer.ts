import { Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest } from "effect/http";

import type {
  AuthorizedAccount,
  IssuedTokens,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { AvatarUrlSchema } from "#channels/domain/avatar-url.ts";
import { tokenPolicies } from "#channels/domain/token-policy.ts";
import {
  googleOAuth,
  googleOAuthEndpoints,
  googleScope as scope,
} from "#channels/infrastructure/platforms/google/google-oauth.ts";
import type { GoogleOAuthEndpoints } from "#channels/infrastructure/platforms/google/google-oauth.ts";
import type { OAuthClient } from "#channels/infrastructure/platforms/oauth-client.ts";
import {
  bodyOf,
  exchanged,
} from "#channels/infrastructure/platforms/oauth-exchange.ts";
import type { AuthorizerHttp } from "#channels/infrastructure/platforms/oauth-exchange.ts";

/** Where Google's sign-in and the YouTube Data API are. */
export interface YouTubeEndpoints extends GoogleOAuthEndpoints {
  /** The YouTube Data API's host, which lists the signed-in channel. */
  readonly api: URL;
}

export const youtubeEndpoints: YouTubeEndpoints = {
  ...googleOAuthEndpoints,
  api: new URL("https://www.googleapis.com"),
};

export const youtubeCallbackPath = "/connect/youtube/callback";

/**
 * What Peal asks a Google account for, the narrowest scopes that do it:
 * `youtube.upload`, to upload videos (videos.insert), and
 * `youtube.readonly`, to read the channel it signed in as (channels.list),
 * its videos' processing and their statistics (videos.list), private ones
 * included. Neither lets Peal change or delete anything else.
 */
export const youtubeScopes: readonly string[] = [
  scope("youtube.upload"),
  scope("youtube.readonly"),
];

// What each permission Peal needs is granted by, as Google names the
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
 * A YouTube channel, through Google's OAuth (`googleOAuth`): an owner of
 * brand accounts picks the channel on Google's chooser, and the token is
 * that channel's. Disconnecting a channel revokes its tokens at Google.
 */
export const youtubeAuthorizer = Effect.fn("YouTubeAuthorizer.make")(
  function* youtubeAuthorizer(options: {
    readonly client: OAuthClient;
    readonly endpoints: YouTubeEndpoints;
    readonly http: AuthorizerHttp;
    readonly publicUrl: string;
  }) {
    const { endpoints, http } = options;

    const oauth = yield* googleOAuth({
      client: options.client,
      endpoints,
      http,
      needed: neededScopes,
      redirectUri: new URL(youtubeCallbackPath, options.publicUrl).href,
      scopes: youtubeScopes,
      settings: "YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET",
    });

    // The channels the token signs in as: one, the account the owner
    // picked; none when that Google account has no channel.
    const channelsOf = (accessToken: Redacted.Redacted) =>
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

    const complete: PlatformAuthorizer["complete"] = (request) =>
      Effect.gen(function* completing() {
        const tokens = yield* oauth.exchange(request);
        const channels = yield* channelsOf(tokens.accessToken);

        return {
          _tag: "choice" as const,
          accounts: channels.map((channel) => accountOf(channel, tokens)),
        };
      });

    const authorizer: PlatformAuthorizer = {
      begin: oauth.begin,
      complete,
      platform: "youtube",
      policy: tokenPolicies.youtube,
      refresh: oauth.refresh,
      revoke: oauth.revoke,
    };

    return authorizer;
  }
);
