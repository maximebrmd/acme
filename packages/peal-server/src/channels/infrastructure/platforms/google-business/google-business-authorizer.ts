import { Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest } from "effect/http";

import type {
  AuthorizedAccount,
  IssuedTokens,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { tokenPolicies } from "#channels/domain/token-policy.ts";
import {
  googleOAuth,
  googleOAuthEndpoints,
  googleScope,
} from "#channels/infrastructure/platforms/google/google-oauth.ts";
import type { GoogleOAuthEndpoints } from "#channels/infrastructure/platforms/google/google-oauth.ts";
import type { OAuthClient } from "#channels/infrastructure/platforms/oauth-client.ts";
import {
  bodyOf,
  exchanged,
} from "#channels/infrastructure/platforms/oauth-exchange.ts";
import type {
  AuthorizerHttp,
  ExchangeFailure,
} from "#channels/infrastructure/platforms/oauth-exchange.ts";

/** Where Google's sign-in and the Business Profile APIs are. */
export interface GoogleBusinessEndpoints extends GoogleOAuthEndpoints {
  /** The My Business Account Management API, which lists accounts. */
  readonly accountManagement: URL;
  /** The My Business Business Information API, which lists locations. */
  readonly businessInformation: URL;
}

export const googleBusinessEndpoints: GoogleBusinessEndpoints = {
  ...googleOAuthEndpoints,
  accountManagement: new URL(
    "https://mybusinessaccountmanagement.googleapis.com"
  ),
  businessInformation: new URL(
    "https://mybusinessbusinessinformation.googleapis.com"
  ),
};

export const googleBusinessCallbackPath = "/connect/googleBusiness/callback";

/**
 * What Peal asks a Google account for: `business.manage`, the one scope of
 * the Business Profile APIs (its older name, `plus.business.manage`, is
 * deprecated and never asked).
 */
export const googleBusinessScopes: readonly string[] = [
  googleScope("business.manage"),
];

const neededScopes: readonly (readonly string[])[] = [googleBusinessScopes];

/**
 * The most accounts and locations one sign-in offers: an agency's account
 * can reach thousands, more than a picker shows or a choice should hold.
 */
export const googleBusinessReach = { accounts: 100, locations: 200 } as const;

// accounts.list answers 20 accounts at most, locations.list 100.
const accountsPageSize = 20;

const locationsPageSize = 100;

// An account, as accounts.list shows it: `accounts/{accountId}`.
const AccountSchema = Schema.Struct({
  name: Schema.NonEmptyString,
});

const AccountsSchema = Schema.Struct({
  accounts: Schema.optionalKey(Schema.Array(AccountSchema)),
  nextPageToken: Schema.optionalKey(Schema.String),
});

// A location, as locations.list shows it with the read mask below:
// `locations/{locationId}`, without its account.
const LocationSchema = Schema.Struct({
  metadata: Schema.optionalKey(
    Schema.Struct({
      hasVoiceOfMerchant: Schema.optionalKey(Schema.Boolean),
    })
  ),
  name: Schema.NonEmptyString,
  storeCode: Schema.optionalKey(Schema.String),
  storefrontAddress: Schema.optionalKey(
    Schema.Struct({
      addressLines: Schema.optionalKey(Schema.Array(Schema.String)),
      locality: Schema.optionalKey(Schema.String),
    })
  ),
  title: Schema.optionalKey(Schema.String),
});

const LocationsSchema = Schema.Struct({
  locations: Schema.optionalKey(Schema.Array(LocationSchema)),
  nextPageToken: Schema.optionalKey(Schema.String),
});

type GoogleLocation = typeof LocationSchema.Type;

// What locations.list must answer of each location: its read mask is
// required.
const readMask = "name,title,storeCode,storefrontAddress,metadata";

const accountName = /^accounts\/[^/]+$/u;

const locationName = /^locations\/[^/]+$/u;

const nonBlank = (text: string | undefined): Option.Option<string> =>
  Option.fromUndefinedOr(text).pipe(
    Option.map((value) => value.trim()),
    Option.filter((value) => value !== "")
  );

// What tells a business's locations apart: the street and the town, or the
// store's code, or else the location's id.
const handleOf = (location: GoogleLocation): string => {
  const address = [
    location.storefrontAddress?.addressLines?.[0],
    location.storefrontAddress?.locality,
  ].flatMap((part) => Option.toArray(nonBlank(part)));

  return address.length > 0
    ? address.join(", ")
    : Option.getOrElse(nonBlank(location.storeCode), () => location.name);
};

/**
 * The channel's account id: the location's name in the My Business API v4,
 * `accounts/{accountId}/locations/{locationId}`, which local posts are
 * made under. The account is the one the tokens' owner reaches the location
 * through.
 */
export const locationPathOf = (account: string, location: string) =>
  `${account}/${location}`;

const accountOf = (
  account: string,
  location: GoogleLocation,
  tokens: IssuedTokens
): AuthorizedAccount => ({
  accountId: locationPathOf(account, location.name),
  avatarUrl: Option.none(),
  displayName: nonBlank(location.title),
  handle: handleOf(location),
  tokens,
});

const pageParam = (token: Option.Option<string>) =>
  Option.match(token, {
    onNone: () => ({}),
    onSome: (pageToken) => ({ pageToken }),
  });

// A project without access to the Business Profile APIs is answered 429
// (a quota of 0), or 403 while the APIs are not enabled: the operator's
// to fix, which the log says.
const explained = <A>(
  listing: Effect.Effect<A, ExchangeFailure>
): Effect.Effect<A, ExchangeFailure> =>
  listing.pipe(
    Effect.tapError(() =>
      Effect.logWarning(
        "Google did not list the Business Profile accounts and locations: check that the project of GOOGLE_BUSINESS_CLIENT_ID has the Business Profile APIs enabled and was given access to them (a quota above 0)"
      )
    )
  );

/**
 * A location of a Google Business Profile, through Google's OAuth
 * (`googleOAuth`) with the `business.manage` scope. The sign-in reaches
 * every location of every account the Google user owns or manages
 * (accounts.list, then each account's locations.list): `complete` answers
 * them as an `AccountChoice`, one channel per location.
 *
 * Only a location with Voice of Merchant (`metadata.hasVoiceOfMerchant`:
 * verified, in good standing) is offered: Google takes no post for the
 * others. A project Google has not given access to the Business Profile
 * APIs has a quota of 0, and every listing answers 429: connecting then
 * fails as the platform being unavailable, and the log says why.
 */
export const googleBusinessAuthorizer = Effect.fn(
  "GoogleBusinessAuthorizer.make"
)(function* googleBusinessAuthorizer(options: {
  readonly client: OAuthClient;
  readonly endpoints: GoogleBusinessEndpoints;
  readonly http: AuthorizerHttp;
  readonly publicUrl: string;
}) {
  const { endpoints, http } = options;

  const oauth = yield* googleOAuth({
    client: options.client,
    endpoints,
    http,
    needed: neededScopes,
    redirectUri: new URL(googleBusinessCallbackPath, options.publicUrl).href,
    scopes: googleBusinessScopes,
    settings: "GOOGLE_BUSINESS_CLIENT_ID and GOOGLE_BUSINESS_CLIENT_SECRET",
  });

  const listed = <A, I>(
    what: string,
    url: URL,
    params: Readonly<Record<string, string>>,
    accessToken: Redacted.Redacted,
    schema: Schema.Codec<A, I>
  ) =>
    HttpClientRequest.get(url).pipe(
      HttpClientRequest.setUrlParams(params),
      HttpClientRequest.bearerToken(accessToken),
      http.execute,
      Effect.flatMap(bodyOf(what, schema)),
      exchanged
    );

  // The accounts the Google user owns or manages, `googleBusinessReach`
  // at most.
  const accountsOf = Effect.fn("GoogleBusinessAuthorizer.accounts")(
    function* accountsOf(accessToken: Redacted.Redacted) {
      const names: string[] = [];
      let page = Option.none<string>();

      do {
        const answer = yield* listed(
          "Listing the accounts",
          new URL("/v1/accounts", endpoints.accountManagement),
          { pageSize: String(accountsPageSize), ...pageParam(page) },
          accessToken,
          AccountsSchema
        );

        names.push(
          ...(answer.accounts ?? [])
            .map(({ name }) => name)
            .filter((name) => accountName.test(name))
        );
        page = nonBlank(answer.nextPageToken);
      } while (
        Option.isSome(page) &&
        names.length < googleBusinessReach.accounts
      );

      return names.slice(0, googleBusinessReach.accounts);
    }
  );

  // The account's locations that can post, `room` at most.
  const locationsOf = Effect.fn("GoogleBusinessAuthorizer.locations")(
    function* locationsOf(
      account: string,
      accessToken: Redacted.Redacted,
      room: number
    ) {
      const found: GoogleLocation[] = [];
      let page = Option.none<string>();

      do {
        const answer = yield* listed(
          "Listing the locations",
          new URL(`/v1/${account}/locations`, endpoints.businessInformation),
          {
            pageSize: String(locationsPageSize),
            readMask,
            ...pageParam(page),
          },
          accessToken,
          LocationsSchema
        );

        found.push(
          ...(answer.locations ?? []).filter(
            (location) =>
              locationName.test(location.name) &&
              location.metadata?.hasVoiceOfMerchant === true
          )
        );
        page = nonBlank(answer.nextPageToken);
      } while (Option.isSome(page) && found.length < room);

      return found.slice(0, room);
    }
  );

  const reached = Effect.fn("GoogleBusinessAuthorizer.reached")(
    function* reached(tokens: IssuedTokens) {
      const accounts: AuthorizedAccount[] = [];

      for (const account of yield* accountsOf(tokens.accessToken)) {
        const room = googleBusinessReach.locations - accounts.length;

        if (room <= 0) {
          yield* Effect.logWarning(
            "A Google Business Profile sign-in reaches more locations than Peal offers"
          );

          break;
        }

        const locations = yield* locationsOf(account, tokens.accessToken, room);

        accounts.push(
          ...locations.map((location) => accountOf(account, location, tokens))
        );
      }

      return accounts;
    }
  );

  const complete: PlatformAuthorizer["complete"] = (request) =>
    Effect.gen(function* completing() {
      const tokens = yield* oauth.exchange(request);

      return {
        _tag: "choice" as const,
        accounts: yield* explained(reached(tokens)),
      };
    });

  const authorizer: PlatformAuthorizer = {
    begin: oauth.begin,
    complete,
    platform: "googleBusiness",
    policy: tokenPolicies.googleBusiness,
    refresh: oauth.refresh,
    revoke: oauth.revoke,
  };

  return authorizer;
});
