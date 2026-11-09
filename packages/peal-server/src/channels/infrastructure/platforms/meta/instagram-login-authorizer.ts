import { DateTime, Duration, Effect, Option, Redacted, Schema } from "effect";
import { SecureRandom } from "effect/crypto";
import { Base64Url } from "effect/encoding";

import { AuthorizationDenied } from "#channels/application/authorization-denied.ts";
import { AuthorizationFailed } from "#channels/application/authorization-failed.ts";
import type {
  AuthorizedAccount,
  IssuedTokens,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { tokenPolicies } from "#channels/domain/token-policy.ts";
import type { MetaApp } from "#shared/infrastructure/platforms/meta-apps.ts";
import { instagramUrl } from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

import { avatarOf } from "./facebook-login.ts";
import {
  exchange,
  getWith,
  postForm,
  refreshFailure,
  signInFailure,
} from "./meta-exchange.ts";
import type { MetaHttp } from "./meta-exchange.ts";

/** Where Instagram sends the member back, as for Facebook Login. */
export const instagramCallbackPath = "/connect/instagram/callback";

// Reading the account and publishing for it, without which nothing can be
// posted, and the insights analytics reads, which an account may decline.
// Comments and messages are not asked for. Meta retired the older
// `business_*` names on 2025-01-27.
const requiredScopes = [
  "instagram_business_basic",
  "instagram_business_content_publish",
] as const;

const optionalScopes = ["instagram_business_manage_insights"] as const;

const instagramScopes = [...requiredScopes, ...optionalScopes];

// From Meta's "Business Login for Instagram" page. The code (an hour, used
// once) buys a short-lived token on api.instagram.com, whose answer lists
// the permissions granted, as a comma-separated string or an array, flat or
// in a `data` list; the short-lived token buys a long-lived one (60 days)
// on graph.instagram.com, renewed with itself once a day old.
const PermissionsSchema = Schema.Union([
  Schema.String,
  Schema.Array(Schema.String),
]);

const GrantSchema = Schema.Struct({
  access_token: Schema.NonEmptyString,
  permissions: Schema.optionalKey(PermissionsSchema),
});

const ShortLivedSchema = Schema.Union([
  Schema.Struct({ data: Schema.NonEmptyArray(GrantSchema) }),
  GrantSchema,
]);

const LongLivedSchema = Schema.Struct({
  access_token: Schema.NonEmptyString,
  expires_in: Schema.optionalKey(Schema.Number),
});

// Meta writes ids as strings, and sometimes as numbers.
const IdSchema = Schema.Union([Schema.NonEmptyString, Schema.Int]);

// `user_id` is the professional account's id, which publishing and Meta's
// other APIs name it by; `id` is the app-scoped id of the app's user.
const ProfileSchema = Schema.Struct({
  id: IdSchema,
  name: Schema.optionalKey(Schema.String),
  profile_picture_url: Schema.optionalKey(Schema.String),
  user_id: IdSchema,
  username: Schema.NonEmptyString,
});

const AppUserSchema = Schema.Struct({ id: IdSchema });

const isText = Schema.is(Schema.String);

const profileFields = "id,user_id,username,name,profile_picture_url";

const grantOf = (
  answer: typeof ShortLivedSchema.Type
): typeof GrantSchema.Type => ("data" in answer ? answer.data[0] : answer);

const permissionsOf = (
  permissions: typeof PermissionsSchema.Type | undefined
): readonly string[] => {
  if (permissions === undefined) {
    return [];
  }

  const listed = isText(permissions) ? permissions.split(",") : permissions;

  return listed.map((permission) => permission.trim()).filter(Boolean);
};

// Meta's tokens expire 60 days after they were issued or renewed; an answer
// without `expires_in` is taken to say so.
const lifetimeOf = (expiresIn: number | undefined) =>
  expiresIn === undefined || expiresIn <= 0
    ? Duration.days(60)
    : Duration.seconds(expiresIn);

// Instagram may end the code with `#_`, which is not part of it.
const codeOf = (code: string) => code.replace(/#_$/u, "");

/**
 * Instagram professional accounts through the Instagram API with Instagram
 * Login: the member signs in to the account itself on Instagram, which
 * needs no Facebook Page, through the Instagram use case of Meta's app,
 * which has its own app id and secret. The code becomes a short-lived
 * token, then a long-lived one that lasts 60 days and renews itself once a
 * day old: the refresh sweep renews it a week before it expires. A token
 * nobody renewed in 60 days cannot be renewed again, and the member
 * reconnects. Declining publishing refuses the sign-in; declining insights
 * leaves the channel posting without counts.
 *
 * The channel keeps the professional account's id as its account, and the
 * app-scoped id of the app's user as the grant its token rests on, as a
 * data deletion request may name either.
 */
export const instagramLoginAuthorizer = Effect.fn(
  "InstagramLoginAuthorizer.make"
)(function* instagramLoginAuthorizer(options: {
  readonly app: MetaApp;
  readonly hosts: MetaHosts;
  readonly http: MetaHttp;
  readonly publicUrl: string;
}) {
  const random = yield* SecureRandom.SecureRandom;
  const { app, hosts, http } = options;
  const redirectUri = new URL(instagramCallbackPath, options.publicUrl).href;

  const begin: PlatformAuthorizer["begin"] = () =>
    Effect.gen(function* beginning() {
      const state = Base64Url.encode(yield* random.randomBytes(32));
      const url = new URL("/oauth/authorize", hosts.instagramAuthorize);

      url.search = new URLSearchParams({
        client_id: app.appId,
        // Asks for the account's own credentials even when the browser is
        // signed in to Instagram, so the member picks the account to
        // connect rather than whichever one the browser holds.
        force_reauth: "true",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: instagramScopes.join(","),
        state,
      }).toString();

      return {
        authorizationUrl: url.href,
        instance: Option.none(),
        // Nothing is kept between the two ends of the sign-in but the
        // state, which the attempt is stored under.
        secret: Redacted.make(""),
        state,
      };
    });

  const appUserOf = (token: Redacted.Redacted) =>
    exchange(
      http,
      getWith(instagramUrl(hosts, "/me"), {
        access_token: token,
        fields: "id",
      }),
      AppUserSchema
    ).pipe(Effect.map(({ id }) => String(id)));

  const issuedNow = Effect.fnUntraced(function* issuedNow(
    token: typeof LongLivedSchema.Type,
    scopes: readonly string[],
    grantedBy: string
  ) {
    const now = yield* DateTime.now;

    const tokens: IssuedTokens = {
      accessToken: Redacted.make(token.access_token),
      expiresAt: Option.some(
        DateTime.addDuration(now, lifetimeOf(token.expires_in))
      ),
      grantedBy,
      // The long-lived token renews itself: there is no refresh token.
      refreshToken: Option.none(),
      renewable: true,
      scopes,
    };

    return tokens;
  });

  const complete: PlatformAuthorizer["complete"] = ({ callback }) =>
    Effect.gen(function* completing() {
      if (Option.isNone(callback.code)) {
        return yield* new AuthorizationFailed({
          reason: "the callback has no code",
        });
      }

      const grant = yield* exchange(
        http,
        postForm(new URL("/oauth/access_token", hosts.instagramApi), {
          client_id: app.appId,
          client_secret: app.appSecret,
          code: Redacted.make(codeOf(callback.code.value)),
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
        ShortLivedSchema
      ).pipe(
        Effect.map(grantOf),
        Effect.mapError(signInFailure("The code exchange"))
      );

      // An answer that lists no permissions granted what was asked.
      const listed = permissionsOf(grant.permissions);
      const granted = listed.length === 0 ? instagramScopes : listed;

      if (!requiredScopes.every((scope) => granted.includes(scope))) {
        return yield* new AuthorizationDenied();
      }

      const token = yield* exchange(
        http,
        getWith(new URL("/access_token", hosts.instagramGraph), {
          access_token: Redacted.make(grant.access_token),
          client_secret: app.appSecret,
          grant_type: "ig_exchange_token",
        }),
        LongLivedSchema
      ).pipe(Effect.mapError(signInFailure("The long-lived token exchange")));

      const profile = yield* exchange(
        http,
        getWith(instagramUrl(hosts, "/me"), {
          access_token: Redacted.make(token.access_token),
          fields: profileFields,
        }),
        ProfileSchema
      ).pipe(Effect.mapError(signInFailure("Reading the profile")));

      const account: AuthorizedAccount = {
        accountId: String(profile.user_id),
        avatarUrl: avatarOf(profile.profile_picture_url),
        displayName: Option.fromUndefinedOr(profile.name).pipe(
          Option.filter((name) => name.trim() !== "")
        ),
        handle: `@${profile.username}`,
        tokens: yield* issuedNow(token, granted, String(profile.id)),
      };

      return account;
    });

  // The long-lived token is its own refresh token. The app-scoped id is
  // read first, with the token as it is, so the renewed token keeps the
  // grant it rests on; a token Meta no longer takes cannot be renewed.
  const refresh: PlatformAuthorizer["refresh"] = (channel, tokens) =>
    Effect.gen(function* refreshing() {
      const grantedBy = yield* appUserOf(tokens.accessToken);

      const renewed = yield* exchange(
        http,
        getWith(new URL("/refresh_access_token", hosts.instagramGraph), {
          access_token: tokens.accessToken,
          grant_type: "ig_refresh_token",
        }),
        LongLivedSchema
      );

      return yield* issuedNow(renewed, channel.scopes, grantedBy);
    }).pipe(Effect.mapError(refreshFailure));

  const authorizer: PlatformAuthorizer = {
    begin,
    complete,
    connection: "instagramLogin",
    platform: "instagram",
    policy: tokenPolicies.instagramLogin,
    refresh,
  };

  return authorizer;
});
