import { Effect, Match, Option, Redacted, Result, Schema } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { Base64Url } from "effect/encoding";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { AuthorizationFailed } from "#channels/application/authorization-failed.ts";
import { InstanceNotAllowed } from "#channels/application/instance-not-allowed.ts";
import type {
  AuthorizedAccount,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { AvatarUrlSchema } from "#channels/domain/avatar-url.ts";
import { parseInstance } from "#channels/domain/instance-origin.ts";
import { InvalidInstance } from "#channels/domain/invalid-instance.ts";
import { tokenPolicies } from "#channels/domain/token-policy.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

import { MastodonApps } from "./mastodon-apps.ts";
import type { MastodonApp } from "./mastodon-apps.ts";

// Mastodon 4.3 added the `profile` scope, which reads only the account's
// own profile; older servers need `read:accounts` for that. Posting needs
// statuses and media either way.
const profileScopes = "profile write:statuses write:media";

const legacyScopes = "read:accounts write:statuses write:media";

export const mastodonCallbackPath = "/connect/mastodon/callback";

const ServerMetadataSchema = Schema.Struct({
  scopes_supported: Schema.optionalKey(Schema.Array(Schema.String)),
});

const RegisteredAppSchema = Schema.Struct({
  client_id: Schema.NonEmptyString,
  client_secret: Schema.NonEmptyString,
});

const TokenSchema = Schema.Struct({
  access_token: Schema.NonEmptyString,
  scope: Schema.optionalKey(Schema.String),
});

const AccountSchema = Schema.Struct({
  avatar_static: Schema.optionalKey(Schema.String),
  display_name: Schema.optionalKey(Schema.String),
  id: Schema.NonEmptyString,
  username: Schema.NonEmptyString,
});

const decodeAvatar = Schema.decodeUnknownOption(AvatarUrlSchema);

// A Mastodon account's id is unique on its server only, so Acme names an
// account `<id>@<host>`, which is also how its server is found again.
const accountIdOf = (id: string, instance: URL) => `${id}@${instance.host}`;

const accountPattern = /^[^@\s]+@(?<host>[^@\s/]+)$/u;

const instanceOfAccount = (accountId: string): Option.Option<string> =>
  Option.fromNullOr(accountPattern.exec(accountId)?.groups?.["host"]).pipe(
    Option.map((host) => `https://${host}`)
  );

type Failure =
  | AuthorizationFailed
  | InstanceNotAllowed
  | InvalidInstance
  | PlatformUnavailable;

// Refused by the outbound guard: the user's typo, a server Acme may not
// call, or a lookup that may pass later.
const refusal = (refused: OutboundRequestRefused): Failure =>
  Match.value(refused.reason).pipe(
    Match.when("unknownHost", () => new InvalidInstance()),
    Match.when("lookupFailed", () => new PlatformUnavailable()),
    Match.orElse(() => new InstanceNotAllowed({ host: refused.host }))
  );

// The instance a member typed, or that a channel's account lives on.
const instanceFor = (input: Option.Option<string>) =>
  input.pipe(
    Option.match({
      onNone: () => Result.fail(new InvalidInstance()),
      onSome: parseInstance,
    }),
    Effect.fromResult,
    Effect.map((origin) => new URL(origin))
  );

// A transport failure, or a server error, is the instance being down; any
// other answer that is not a success is the instance refusing.
const answer = (
  what: string
): ((
  response: HttpClientResponse.HttpClientResponse
) => Effect.Effect<HttpClientResponse.HttpClientResponse, Failure>) =>
  Effect.fnUntraced(function* answered(response) {
    if (response.status >= 200 && response.status < 300) {
      return response;
    }

    return yield* response.status >= 500 || response.status === 429
      ? new PlatformUnavailable()
      : new AuthorizationFailed({
          reason: `${what} answered ${response.status}`,
        });
  });

const unreadable = (what: string) => () =>
  new AuthorizationFailed({ reason: `${what} sent an unexpected answer` });

const sent = <A>(
  request: Effect.Effect<
    A,
    Failure | HttpClientError.HttpClientError | OutboundRequestRefused
  >
): Effect.Effect<A, Failure> =>
  request.pipe(
    Effect.catchTags({
      HttpClientError: () => Effect.fail(new PlatformUnavailable()),
      OutboundRequestRefused: (refused) => Effect.fail(refusal(refused)),
    })
  );

const encoder = new TextEncoder();

/**
 * Mastodon, on whichever instance the account lives: Acme registers an app
 * there the first time (POST /api/v1/apps) and reuses it, then signs in with
 * OAuth 2's authorization code and PKCE (S256). Tokens never expire, so there
 * is nothing to refresh: a revoked token asks the user to reconnect.
 *
 * `http` must be the public HTTP client, which checks every instance against
 * the outbound guard and follows no redirect.
 */
export const mastodonAuthorizer = Effect.fn("MastodonAuthorizer.make")(
  function* mastodonAuthorizer(options: {
    readonly http: HttpClient.HttpClient.With<
      HttpClientError.HttpClientError | OutboundRequestRefused
    >;
    readonly publicUrl: string;
  }) {
    const apps = yield* MastodonApps;
    const random = yield* SecureRandom.SecureRandom;
    const digest = yield* Digest.Digest;
    const { http } = options;
    const redirectUri = new URL(mastodonCallbackPath, options.publicUrl).href;

    const randomText = random
      .randomBytes(32)
      .pipe(Effect.map((bytes) => Base64Url.encode(bytes)));

    // Servers that publish OAuth metadata (4.3 and later) say which scopes
    // they know; one that does not is older and lacks `profile`.
    const scopesOf = (instance: URL) =>
      http
        .get(new URL("/.well-known/oauth-authorization-server", instance))
        .pipe(
          Effect.flatMap((response) =>
            response.status === 200
              ? HttpClientResponse.schemaBodyJson(ServerMetadataSchema)(
                  response
                ).pipe(
                  Effect.map(({ scopes_supported: supported = [] }) =>
                    supported.includes("profile") ? profileScopes : legacyScopes
                  ),
                  Effect.orElseSucceed(() => legacyScopes)
                )
              : Effect.succeed(legacyScopes)
          ),
          sent
        );

    const register = Effect.fn("MastodonAuthorizer.register")(
      function* register(instance: URL) {
        const scopes = yield* scopesOf(instance);

        const registered = yield* HttpClientRequest.post(
          new URL("/api/v1/apps", instance)
        ).pipe(
          HttpClientRequest.bodyJsonUnsafe({
            client_name: "Acme",
            redirect_uris: [redirectUri],
            scopes,
            website: options.publicUrl,
          }),
          http.execute,
          Effect.flatMap(answer("Registering the app")),
          Effect.flatMap((response) =>
            HttpClientResponse.schemaBodyJson(RegisteredAppSchema)(
              response
            ).pipe(Effect.mapError(unreadable("Registering the app")))
          ),
          sent
        );

        return yield* apps.save({
          clientId: registered.client_id,
          clientSecret: Redacted.make(registered.client_secret),
          instance: instance.origin,
          redirectUri,
          scopes,
        });
      }
    );

    const appFor = (instance: URL) =>
      apps.registered(instance.origin, redirectUri).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () => register(instance),
            onSome: (app) => Effect.succeed<MastodonApp>(app),
          })
        )
      );

    const begin: PlatformAuthorizer["begin"] = (request) =>
      Effect.gen(function* beginning() {
        const instance = yield* instanceFor(
          request.reconnecting.pipe(
            Option.match({
              onNone: () => request.instance,
              onSome: (channel) => instanceOfAccount(channel.accountId),
            })
          )
        );

        const app = yield* appFor(instance);
        const verifier = yield* randomText;
        const state = yield* randomText;

        const challenge = Base64Url.encode(
          yield* digest.digest(Digest.sha256, encoder.encode(verifier))
        );

        const url = new URL("/oauth/authorize", instance);

        url.search = new URLSearchParams({
          client_id: app.clientId,
          code_challenge: challenge,
          code_challenge_method: "S256",
          redirect_uri: redirectUri,
          response_type: "code",
          scope: app.scopes,
          state,
        }).toString();

        return {
          authorizationUrl: url.href,
          instance: Option.some(instance.origin),
          secret: Redacted.make(verifier),
          state,
        };
      });

    const complete: PlatformAuthorizer["complete"] = ({
      attempt,
      callback,
      secret,
    }) =>
      Effect.gen(function* completing() {
        const instance = yield* instanceFor(attempt.instance).pipe(
          Effect.mapError(
            () =>
              new AuthorizationFailed({ reason: "the attempt has no instance" })
          )
        );

        if (Option.isNone(callback.code)) {
          return yield* new AuthorizationFailed({
            reason: "the callback has no code",
          });
        }

        const app = yield* apps.registered(instance.origin, redirectUri).pipe(
          Effect.orDie,
          Effect.flatMap(
            Option.match({
              onNone: () =>
                Effect.fail(
                  new AuthorizationFailed({
                    reason: "the instance's app is gone",
                  })
                ),
              onSome: Effect.succeed,
            })
          )
        );

        const token = yield* HttpClientRequest.post(
          new URL("/oauth/token", instance)
        ).pipe(
          HttpClientRequest.bodyUrlParams({
            client_id: app.clientId,
            client_secret: Redacted.value(app.clientSecret),
            code: callback.code.value,
            code_verifier: Redacted.value(secret),
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
          http.execute,
          Effect.flatMap(answer("The token exchange")),
          Effect.flatMap((response) =>
            HttpClientResponse.schemaBodyJson(TokenSchema)(response).pipe(
              Effect.mapError(unreadable("The token exchange"))
            )
          ),
          sent
        );

        const account = yield* HttpClientRequest.get(
          new URL("/api/v1/accounts/verify_credentials", instance)
        ).pipe(
          HttpClientRequest.bearerToken(token.access_token),
          http.execute,
          Effect.flatMap(answer("Reading the account")),
          Effect.flatMap((response) =>
            HttpClientResponse.schemaBodyJson(AccountSchema)(response).pipe(
              Effect.mapError(unreadable("Reading the account"))
            )
          ),
          sent
        );

        const authorized: AuthorizedAccount = {
          accountId: accountIdOf(account.id, instance),
          avatarUrl: Option.fromUndefinedOr(account.avatar_static).pipe(
            Option.flatMap(decodeAvatar)
          ),
          displayName: Option.fromUndefinedOr(account.display_name).pipe(
            Option.filter((name) => name.trim() !== "")
          ),
          handle: `@${account.username}@${instance.host}`,
          tokens: {
            accessToken: Redacted.make(token.access_token),
            expiresAt: Option.none(),
            refreshToken: Option.none(),
            renewable: false,
            scopes: (token.scope ?? app.scopes).split(" "),
          },
        };

        return authorized;
      }).pipe(
        // The instance resolved when the attempt started: one that no
        // longer does is the platform's failure here, not the user's typo.
        Effect.catchTag("InvalidInstance", () =>
          Effect.fail(
            new AuthorizationFailed({ reason: "the instance did not resolve" })
          )
        )
      );

    const authorizer: PlatformAuthorizer = {
      begin,
      complete,
      platform: "mastodon",
      policy: tokenPolicies.mastodon,
      // Mastodon tokens do not expire and come without a refresh token, so
      // its policy never makes one due; a token that stops working was
      // revoked, and only reconnecting replaces it.
      refresh: () => Effect.fail(new TokenExpired()),
    };

    return authorizer;
  }
);
