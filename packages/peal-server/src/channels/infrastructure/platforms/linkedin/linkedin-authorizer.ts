import { DateTime, Duration, Effect, Option, Redacted, Schema } from "effect";
import { HttpClientRequest } from "effect/http";

import { AuthorizationFailed } from "#channels/application/authorization-failed.ts";
import type {
  AuthorizedAccount,
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
import type { AuthorizerHttp } from "#channels/infrastructure/platforms/oauth-exchange.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";

/** Where LinkedIn's sign-in and APIs are. */
export interface LinkedInEndpoints {
  /** The API host, which serves the OpenID Connect profile. */
  readonly api: URL;
  /** The page the member signs in and agrees on. */
  readonly authorization: URL;
  /** Where codes are exchanged for tokens. */
  readonly token: URL;
}

export const linkedinEndpoints: LinkedInEndpoints = {
  api: new URL("https://api.linkedin.com"),
  authorization: new URL("https://www.linkedin.com/oauth/v2/authorization"),
  token: new URL("https://www.linkedin.com/oauth/v2/accessToken"),
};

export const linkedinCallbackPath = "/connect/linkedin/callback";

/**
 * What Peal asks a member for: OpenID Connect's `openid` and `profile`, to
 * read who signed in (the "Sign In with LinkedIn using OpenID Connect"
 * product), and `w_member_social`, to post as them ("Share on LinkedIn").
 * Both products are self-serve, with no review.
 */
export const linkedinScopes: readonly string[] = [
  "openid",
  "profile",
  "w_member_social",
];

// The member, from OpenID Connect's userinfo: `sub` is the id the person's
// URN takes (`urn:li:person:<sub>`), which posts name as their author.
const UserInfoSchema = Schema.Struct({
  family_name: Schema.optionalKey(Schema.String),
  given_name: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
  picture: Schema.optionalKey(Schema.String),
  sub: Schema.NonEmptyString,
});

type UserInfo = typeof UserInfoSchema.Type;

const decodeAvatar = Schema.decodeUnknownOption(AvatarUrlSchema);

// LinkedIn shows people by their name: members have no handle the API
// gives, so the name stands for it.
const nameOf = (user: UserInfo): string =>
  Option.fromUndefinedOr(user.name).pipe(
    Option.orElse(() =>
      Option.some(
        [user.given_name, user.family_name]
          .filter((part) => part !== undefined)
          .join(" ")
      )
    ),
    Option.map((name) => name.trim()),
    Option.filter((name) => name !== ""),
    Option.getOrElse(() => "LinkedIn member")
  );

/**
 * A LinkedIn member's account, through LinkedIn's 3-legged OAuth: the
 * authorization code flow with the client secret (its web flow has no
 * PKCE), then OpenID Connect's userinfo for who signed in.
 *
 * Self-serve apps get no refresh token: every access token lasts 60 days
 * (`expires_in`), after which the member signs in again. Reconnecting
 * before then skips LinkedIn's consent page when they are signed in there.
 * The token's expiry is what the reconnect warnings follow.
 */
export const linkedinAuthorizer = Effect.fn("LinkedInAuthorizer.make")(
  function* linkedinAuthorizer(options: {
    readonly client: OAuthClient;
    readonly endpoints: LinkedInEndpoints;
    readonly http: AuthorizerHttp;
    readonly publicUrl: string;
  }) {
    const { client, endpoints, http } = options;
    const redirectUri = new URL(linkedinCallbackPath, options.publicUrl).href;
    const randomText = yield* randomTexts;

    const begin: PlatformAuthorizer["begin"] = () =>
      Effect.gen(function* beginning() {
        const state = yield* randomText;
        const url = new URL(endpoints.authorization);

        url.search = new URLSearchParams({
          client_id: client.clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: linkedinScopes.join(" "),
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

        const token = yield* HttpClientRequest.post(endpoints.token).pipe(
          HttpClientRequest.bodyUrlParams({
            client_id: client.clientId,
            client_secret: Redacted.value(client.clientSecret),
            code: callback.code.value,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
          http.execute,
          Effect.flatMap(bodyOf("The token exchange", TokenAnswerSchema)),
          exchanged
        );

        const user = yield* HttpClientRequest.get(
          new URL("/v2/userinfo", endpoints.api)
        ).pipe(
          HttpClientRequest.bearerToken(token.access_token),
          http.execute,
          Effect.flatMap(bodyOf("Reading the member", UserInfoSchema)),
          exchanged
        );

        const authorized: AuthorizedAccount = {
          accountId: user.sub,
          avatarUrl: Option.fromUndefinedOr(user.picture).pipe(
            Option.flatMap(decodeAvatar)
          ),
          displayName: Option.none(),
          handle: nameOf(user),
          tokens: {
            accessToken: Redacted.make(token.access_token),
            expiresAt: Option.fromUndefinedOr(token.expires_in).pipe(
              Option.filter((seconds) => seconds > 0),
              Option.map((seconds) =>
                DateTime.addDuration(issuedAt, Duration.seconds(seconds))
              )
            ),
            // Only partners of LinkedIn's marketing program get refresh
            // tokens; Peal renews none, so it keeps none.
            refreshToken: Option.none(),
            renewable: false,
            scopes: scopesOf(token, linkedinScopes),
          },
        };

        return authorized;
      });

    const authorizer: PlatformAuthorizer = {
      begin,
      complete,
      platform: "linkedin",
      policy: tokenPolicies.linkedin,
      // Nothing renews a LinkedIn token: its policy never makes one due, and
      // a token LinkedIn refuses asks the member to reconnect.
      refresh: () => Effect.fail(new TokenExpired()),
    };

    return authorizer;
  }
);
