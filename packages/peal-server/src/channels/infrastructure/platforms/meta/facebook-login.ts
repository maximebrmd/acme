import { Effect, Option, Redacted, Schema } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { Base64Url } from "effect/encoding";

import { AuthorizationDenied } from "#channels/application/authorization-denied.ts";
import { AuthorizationFailed } from "#channels/application/authorization-failed.ts";
import type {
  AccountChoice,
  AuthorizedAccount,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { AvatarUrlSchema } from "#channels/domain/avatar-url.ts";
import type { AvatarUrl } from "#channels/domain/avatar-url.ts";
import type { Platform } from "#channels/domain/platform.ts";
import type { TokenPolicy } from "#channels/domain/token-policy.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import type { MetaApp } from "#shared/infrastructure/platforms/meta-apps.ts";
import {
  appSecretProof,
  graphApiVersion,
  graphUrl,
} from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

import { exchange, getWith, signInFailure } from "./meta-exchange.ts";
import type { MetaHttp } from "./meta-exchange.ts";

// From Meta's "Get Long-Lived Access Tokens", "Pages API" and "Instagram
// API with Facebook Login" pages. The code buys a user token, exchanged for
// a long-lived one (about 60 days); listing the user's Pages with it gives
// each Page's own token, which does not expire. Instagram professional
// accounts are reached through the Page they are linked to, with its token.
const TokenSchema = Schema.Struct({
  access_token: Schema.NonEmptyString,
});

const UserSchema = Schema.Struct({ id: Schema.NonEmptyString });

const PermissionsSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({ permission: Schema.String, status: Schema.String })
  ),
});

const InstagramAccountSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  name: Schema.optionalKey(Schema.String),
  profile_picture_url: Schema.optionalKey(Schema.String),
  username: Schema.NonEmptyString,
});

const PageSchema = Schema.Struct({
  access_token: Schema.optionalKey(Schema.NonEmptyString),
  id: Schema.NonEmptyString,
  instagram_business_account: Schema.optionalKey(InstagramAccountSchema),
  name: Schema.NonEmptyString,
  picture: Schema.optionalKey(
    Schema.Struct({
      data: Schema.Struct({ url: Schema.optionalKey(Schema.String) }),
    })
  ),
  tasks: Schema.optionalKey(Schema.Array(Schema.String)),
  username: Schema.optionalKey(Schema.String),
});

const PagesSchema = Schema.Struct({
  data: Schema.Array(PageSchema),
  paging: Schema.optionalKey(
    Schema.Struct({
      cursors: Schema.optionalKey(
        Schema.Struct({ after: Schema.optionalKey(Schema.String) })
      ),
      next: Schema.optionalKey(Schema.String),
    })
  ),
});

/** A Page the user manages, as Meta lists it. */
export type ManagedPage = typeof PageSchema.Type;

const pageFields = [
  "id",
  "name",
  "username",
  "access_token",
  "tasks",
  "picture{url}",
  "instagram_business_account{id,username,name,profile_picture_url}",
].join(",");

// Meta lists Pages a hundred at a time; nobody manages more than this.
const pageSize = 100;

const maxPages = 10;

const decodeAvatar = Schema.decodeUnknownOption(AvatarUrlSchema);

/** The picture at a URL Meta gave, if it is one clients can show. */
export const avatarOf = (url: string | undefined): Option.Option<AvatarUrl> =>
  Option.fromUndefinedOr(url).pipe(Option.flatMap(decodeAvatar));

/** What Facebook Login connects for one of Peal's platforms. */
export interface FacebookLoginProduct {
  /** The accounts of a Page that may become channels, with its token. */
  readonly accountsOf: (page: ManagedPage) => readonly {
    readonly accountId: string;
    readonly avatarUrl: Option.Option<AvatarUrl>;
    readonly displayName: Option.Option<string>;
    readonly handle: string;
  }[];
  readonly platform: Platform;
  readonly policy: TokenPolicy;
  /** The permissions to ask for, all of which posting needs. */
  readonly scopes: readonly string[];
}

/**
 * Facebook Login, as Facebook Pages and Instagram use it: the dialog asks
 * for the product's permissions, the callback's code becomes a long-lived
 * user token, and the user's Pages, each with its token, become the
 * accounts to choose from. A Page token obtained this way does not expire:
 * it stops working when the user revokes the app, changes their password or
 * loses their role on the Page, and only reconnecting replaces it. Every
 * Graph call carries the `appsecret_proof` Meta asks for when the app
 * requires it.
 */
export const facebookLogin = Effect.fn("FacebookLogin.make")(
  function* facebookLogin(
    product: FacebookLoginProduct,
    options: {
      readonly app: MetaApp;
      readonly hosts: MetaHosts;
      readonly http: MetaHttp;
      readonly publicUrl: string;
    }
  ) {
    const random = yield* SecureRandom.SecureRandom;
    const mac = yield* Mac.Mac;
    const { app, hosts, http } = options;
    const { platform, scopes } = product;

    const redirectUri = new URL(
      `/connect/${platform}/callback`,
      options.publicUrl
    ).href;

    const begin: PlatformAuthorizer["begin"] = () =>
      Effect.gen(function* beginning() {
        const state = Base64Url.encode(yield* random.randomBytes(32));

        const url = new URL(
          `/${graphApiVersion}/dialog/oauth`,
          hosts.facebookDialog
        );

        url.search = new URLSearchParams({
          // Asks again for permissions the user declined before.
          auth_type: "rerequest",
          client_id: app.appId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: scopes.join(","),
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

    // A Graph read with the user's token and its proof.
    const read = <A, I>(
      path: string,
      token: Redacted.Redacted,
      params: Readonly<Record<string, string>>,
      schema: Schema.Codec<A, I>
    ) =>
      appSecretProof(token, app.appSecret).pipe(
        Effect.provideService(Mac.Mac, mac),
        Effect.flatMap((proof) =>
          exchange(
            http,
            getWith(graphUrl(hosts, path), {
              ...params,
              access_token: token,
              appsecret_proof: proof,
            }),
            schema
          )
        )
      );

    const tokenFor = (
      params: Readonly<Record<string, Redacted.Redacted | string>>
    ) =>
      exchange(
        http,
        getWith(graphUrl(hosts, "/oauth/access_token"), {
          ...params,
          client_id: app.appId,
          client_secret: app.appSecret,
        }),
        TokenSchema
      ).pipe(Effect.map(({ access_token: token }) => Redacted.make(token)));

    // Every Page the user manages, a hundred at a time.
    const pagesOf = Effect.fnUntraced(function* pagesOf(
      token: Redacted.Redacted
    ) {
      const pages: ManagedPage[] = [];
      let after = Option.none<string>();

      for (let round = 0; round < maxPages; round += 1) {
        const listed = yield* read(
          "/me/accounts",
          token,
          {
            fields: pageFields,
            limit: String(pageSize),
            ...Option.match(after, {
              onNone: () => ({}),
              onSome: (cursor) => ({ after: cursor }),
            }),
          },
          PagesSchema
        );

        pages.push(...listed.data);
        after = Option.fromUndefinedOr(listed.paging?.cursors?.after);

        if (listed.paging?.next === undefined || Option.isNone(after)) {
          break;
        }
      }

      return pages;
    });

    const complete: PlatformAuthorizer["complete"] = ({ callback }) =>
      Effect.gen(function* completing() {
        if (Option.isNone(callback.code)) {
          return yield* new AuthorizationFailed({
            reason: "the callback has no code",
          });
        }

        const shortLived = yield* tokenFor({
          code: Redacted.make(callback.code.value),
          redirect_uri: redirectUri,
        }).pipe(Effect.mapError(signInFailure("The code exchange")));

        const userToken = yield* tokenFor({
          fb_exchange_token: shortLived,
          grant_type: "fb_exchange_token",
        }).pipe(
          Effect.mapError(signInFailure("The long-lived token exchange"))
        );

        const user = yield* read(
          "/me",
          userToken,
          { fields: "id" },
          UserSchema
        ).pipe(Effect.mapError(signInFailure("Reading the user")));

        const permissions = yield* read(
          "/me/permissions",
          userToken,
          {},
          PermissionsSchema
        ).pipe(Effect.mapError(signInFailure("Reading the permissions")));

        const granted = permissions.data
          .filter(({ status }) => status === "granted")
          .map(({ permission }) => permission);

        // Declining one of them on the dialog leaves nothing Peal can post
        // with: the user refused.
        if (!scopes.every((scope) => granted.includes(scope))) {
          return yield* new AuthorizationDenied();
        }

        const pages = yield* pagesOf(userToken).pipe(
          Effect.mapError(signInFailure("Listing the Pages"))
        );

        const accounts = new Map<string, AuthorizedAccount>();

        for (const page of pages) {
          if (page.access_token === undefined) {
            continue;
          }

          for (const account of product.accountsOf(page)) {
            accounts.set(account.accountId, {
              ...account,
              tokens: {
                accessToken: Redacted.make(page.access_token),
                expiresAt: Option.none(),
                grantedBy: user.id,
                refreshToken: Option.none(),
                renewable: false,
                scopes: granted,
              },
            });
          }
        }

        const choice: AccountChoice = {
          _tag: "choice",
          accounts: [...accounts.values()],
        };

        return choice;
      });

    const authorizer: PlatformAuthorizer = {
      begin,
      complete,
      platform,
      policy: product.policy,
      // Page tokens do not expire and come without a refresh token: one
      // that stops working was revoked, and only reconnecting replaces it.
      refresh: () => Effect.fail(new TokenExpired()),
    };

    return authorizer;
  }
);
