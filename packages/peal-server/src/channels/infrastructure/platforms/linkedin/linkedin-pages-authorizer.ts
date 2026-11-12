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
import { tokenPolicies } from "#channels/domain/token-policy.ts";
import type { OAuthClient } from "#channels/infrastructure/platforms/oauth-client.ts";
import {
  bodyOf,
  exchanged,
  oauthErrorOf,
  randomTexts,
  scopesOf,
  TokenAnswerSchema,
} from "#channels/infrastructure/platforms/oauth-exchange.ts";
import type {
  AuthorizerHttp,
  TokenAnswer,
} from "#channels/infrastructure/platforms/oauth-exchange.ts";
import { linkedinCommentScopes } from "#shared/domain/inbox-platform.ts";
import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";

import { linkedinCallbackPath } from "./linkedin-authorizer.ts";
import type { LinkedInEndpoints } from "./linkedin-authorizer.ts";

/**
 * What Peal asks a member for, to post as the pages they administer, all
 * from LinkedIn's Community Management API: `w_organization_social` posts
 * as a page, `r_organization_social` reads its posts back, and
 * `rw_organization_admin` lists the pages the member has a role on and
 * reads their statistics. Nothing about the member's own profile.
 */
export const linkedinPagesScopes: readonly string[] = [
  "r_organization_social",
  "rw_organization_admin",
  "w_organization_social",
];

// Without this one, nothing can be posted.
const postingScope = "w_organization_social";

/**
 * What the pages' sign-in asks for on a server whose inbox reads `inbox`:
 * `linkedinPagesScopes`, and, where it reads LinkedIn, the two comment
 * scopes after them. LinkedIn's consent is all or nothing, so they are
 * never needed to connect; an app LinkedIn did not grant them is refused
 * the whole sign-in (`unauthorized_scope_error`), which is why the
 * operator turns the inbox on only once the app holds them.
 */
export const linkedinPagesScopesFor = (
  inbox: InboxPlatforms
): readonly string[] =>
  inbox.has("linkedin")
    ? [
        ...linkedinPagesScopes,
        linkedinCommentScopes.read,
        linkedinCommentScopes.write,
      ]
    : linkedinPagesScopes;

/**
 * The roles that post a page's own updates, from LinkedIn's access control
 * reference: an administrator "can post updates", a content administrator
 * creates and manages the page's content. The other roles sponsor content,
 * recruit, curate or read.
 */
export const postingRoles: ReadonlySet<string> = new Set([
  "ADMINISTRATOR",
  "CONTENT_ADMINISTRATOR",
]);

// How many roles one call lists, and how many calls a sign-in makes at
// most: a member with more pages than that picks among the first.
const rolesPerPage = 100;
const rolePages = 3;

// How many pages a sign-in offers: each costs a call to read its name, out
// of the hundred a day the Development tier gives a member.
const offeredPages = 25;

const organizationUrn = /^urn:li:organization:(?<id>\d+)$/u;

// A role, as `organizationAcls` lists it. LinkedIn's samples name the page
// `organization` or `organizationTarget`.
const AclSchema = Schema.Struct({
  organization: Schema.optionalKey(Schema.String),
  organizationTarget: Schema.optionalKey(Schema.String),
  role: Schema.String,
  state: Schema.String,
});

const AclsSchema = Schema.Struct({ elements: Schema.Array(AclSchema) });

// What anyone may read of a page: its name, and the name in its address.
const OrganizationSchema = Schema.Struct({
  localizedName: Schema.optionalKey(Schema.String),
  vanityName: Schema.optionalKey(Schema.String),
});

type Organization = typeof OrganizationSchema.Type;

const LookupSchema = Schema.Struct({
  results: Schema.Record(Schema.String, OrganizationSchema),
});

const idOf = (pattern: RegExp, urn: string | undefined) =>
  Option.fromNullishOr(pattern.exec(urn ?? "")?.groups?.["id"]);

const named = (value: string | undefined) =>
  Option.fromUndefinedOr(value).pipe(
    Option.map((text) => text.trim()),
    Option.filter((text) => text !== "")
  );

const expiryOf = (answer: TokenAnswer, issuedAt: DateTime.Utc) =>
  Option.fromUndefinedOr(answer.expires_in).pipe(
    Option.filter((seconds) => seconds > 0),
    Option.map((seconds) =>
      DateTime.addDuration(issuedAt, Duration.seconds(seconds))
    )
  );

// LinkedIn's refusals of the client itself, which no sign-in fixes.
const clientErrors: ReadonlySet<string> = new Set([
  "invalid_client",
  "unauthorized_client",
]);

const refusedRefresh = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, PlatformUnavailable | TokenExpired> =>
  oauthErrorOf(response).pipe(
    Effect.flatMap(
      (code): Effect.Effect<never, PlatformUnavailable | TokenExpired> =>
        Option.exists(code, (name) => clientErrors.has(name))
          ? Effect.logError(
              "LinkedIn refused Peal's pages app: check LINKEDIN_PAGES_CLIENT_ID and LINKEDIN_PAGES_CLIENT_SECRET"
            ).pipe(Effect.andThen(Effect.fail(new PlatformUnavailable())))
          : Effect.fail(new TokenExpired())
    )
  );

/**
 * The company pages a LinkedIn member administers, through an app that has
 * LinkedIn's Community Management API: the same 3-legged OAuth as a
 * member's profile (the authorization code flow with the client secret, no
 * PKCE), with the app's own client and the organization scopes. LinkedIn
 * grants that product to an app that has no other, so it is a second app,
 * with settings of its own, and the member signs in to it apart.
 *
 * After the exchange, `organizationAcls` lists the member's approved roles,
 * and each page they may post to is offered as an account of its own
 * (`urn:li:organization:<id>`), with the member's token: LinkedIn has no
 * page tokens. A page's name comes from the Organization Lookup API, for an
 * administrator its own entity, otherwise the fields anyone reads.
 *
 * Access tokens last 60 days. An app LinkedIn approved for programmatic
 * refresh tokens gets one with them, which renews the access token for a
 * year from the sign-in; without one, the member reconnects, as for a
 * profile. Every call to the versioned API names `version`. Where the
 * inbox reads LinkedIn (`inbox`), the sign-in also asks the comment scopes
 * (`linkedinPagesScopesFor`); off, it asks what it asked before.
 */
export const linkedinPagesAuthorizer = Effect.fn(
  "LinkedInPagesAuthorizer.make"
)(function* linkedinPagesAuthorizer(options: {
  readonly client: OAuthClient;
  readonly endpoints: LinkedInEndpoints;
  readonly http: AuthorizerHttp;
  readonly inbox: InboxPlatforms;
  readonly publicUrl: string;
  readonly version: string;
}) {
  const { client, endpoints, http, version } = options;
  const asked = linkedinPagesScopesFor(options.inbox);
  const redirectUri = new URL(linkedinCallbackPath, options.publicUrl).href;
  const randomText = yield* randomTexts;

  const tokenRequest = (params: Readonly<Record<string, string>>) =>
    HttpClientRequest.post(endpoints.token).pipe(
      HttpClientRequest.bodyUrlParams({
        ...params,
        client_id: client.clientId,
        client_secret: Redacted.value(client.clientSecret),
      })
    );

  // A read of the versioned API, as the member.
  const rest = (path: string, accessToken: string) =>
    HttpClientRequest.get(new URL(path, endpoints.api)).pipe(
      HttpClientRequest.bearerToken(accessToken),
      HttpClientRequest.setHeaders({
        "Linkedin-Version": version,
        "X-Restli-Protocol-Version": "2.0.0",
      })
    );

  const begin: PlatformAuthorizer["begin"] = () =>
    Effect.gen(function* beginning() {
      const state = yield* randomText;
      const url = new URL(endpoints.authorization);

      url.search = new URLSearchParams({
        client_id: client.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: asked.join(" "),
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

  // The member's approved roles, a page of them at a time.
  const rolesOf = Effect.fn("LinkedInPagesAuthorizer.rolesOf")(
    function* rolesOf(accessToken: string) {
      const roles: (typeof AclSchema.Type)[] = [];

      for (let page = 0; page < rolePages; page += 1) {
        const { elements } = yield* rest(
          "/rest/organizationAcls",
          accessToken
        ).pipe(
          HttpClientRequest.setUrlParams({
            count: String(rolesPerPage),
            q: "roleAssignee",
            start: String(page * rolesPerPage),
            state: "APPROVED",
          }),
          http.execute,
          Effect.flatMap(bodyOf("Listing the member's pages", AclsSchema)),
          exchanged
        );

        roles.push(...elements);

        if (elements.length < rolesPerPage) {
          break;
        }
      }

      return roles;
    }
  );

  // A page's name: its own entity, which its administrators read, or the
  // lookup anyone may use. A page neither shows keeps its id for a name,
  // rather than failing the sign-in for the others.
  const organizationOf = Effect.fn("LinkedInPagesAuthorizer.organizationOf")(
    function* organizationOf(accessToken: string, id: string) {
      const own = yield* rest(`/rest/organizations/${id}`, accessToken).pipe(
        http.execute,
        Effect.flatMap(bodyOf("Reading a page", OrganizationSchema)),
        exchanged,
        Effect.map(Option.some),
        Effect.catchTag("AuthorizationFailed", () =>
          Effect.succeed(Option.none<Organization>())
        )
      );

      if (Option.isSome(own)) {
        return own;
      }

      return yield* rest("/rest/organizationsLookup", accessToken).pipe(
        HttpClientRequest.setUrlParam("ids", `List(${id})`),
        http.execute,
        Effect.flatMap(bodyOf("Looking a page up", LookupSchema)),
        exchanged,
        Effect.map(({ results }) => Option.fromUndefinedOr(results[id])),
        Effect.catchTag("AuthorizationFailed", () =>
          Effect.succeed(Option.none<Organization>())
        )
      );
    }
  );

  const complete: PlatformAuthorizer["complete"] = ({
    callback,
    reconnecting,
  }) =>
    Effect.gen(function* completing() {
      if (Option.isNone(callback.code)) {
        return yield* new AuthorizationFailed({
          reason: "the callback has no code",
        });
      }

      const issuedAt = yield* DateTime.now;

      const token = yield* tokenRequest({
        code: callback.code.value,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }).pipe(
        http.execute,
        Effect.flatMap(bodyOf("The token exchange", TokenAnswerSchema)),
        exchanged
      );

      // When LinkedIn's answer lists none, what was asked, all of which
      // its consent granted.
      const scopes = scopesOf(token, asked);

      // An app without the Community Management API gets a token that
      // posts to no page.
      if (!scopes.includes(postingScope)) {
        return yield* new AuthorizationDenied();
      }

      const roles = yield* rolesOf(token.access_token);

      const tokens: IssuedTokens = {
        accessToken: Redacted.make(token.access_token),
        expiresAt: expiryOf(token, issuedAt),
        refreshToken: Option.fromUndefinedOr(token.refresh_token).pipe(
          Option.map((refreshToken) => Redacted.make(refreshToken))
        ),
        renewable: token.refresh_token !== undefined,
        scopes,
      };

      const administered = [
        ...new Set(
          roles
            .filter(
              ({ role, state }) =>
                state === "APPROVED" && postingRoles.has(role)
            )
            .flatMap((role) =>
              Option.toArray(
                idOf(organizationUrn, role.organization).pipe(
                  Option.orElse(() =>
                    idOf(organizationUrn, role.organizationTarget)
                  )
                )
              )
            )
        ),
      ];

      // The page a reconnection is for comes first, so it is offered
      // however many pages the member has.
      const own = reconnecting.pipe(
        Option.flatMap((urn) => idOf(organizationUrn, urn)),
        Option.filter((id) => administered.includes(id)),
        Option.toArray
      );

      const ids = [...new Set([...own, ...administered])].slice(
        0,
        offeredPages
      );

      const accounts = yield* Effect.forEach(
        ids,
        (id) =>
          organizationOf(token.access_token, id).pipe(
            Effect.map((found): AuthorizedAccount => {
              const name = found.pipe(
                Option.flatMap(({ localizedName }) => named(localizedName))
              );

              return {
                accountId: `urn:li:organization:${id}`,
                // A page's logo is a media URN, which takes a call more
                // to turn into an address: pages show without one.
                avatarUrl: Option.none(),
                displayName: name,
                handle: found.pipe(
                  Option.flatMap(({ vanityName }) => named(vanityName)),
                  Option.orElse(() => name),
                  Option.getOrElse(() => id)
                ),
                tokens,
              };
            })
          ),
        { concurrency: 1 }
      );

      return { _tag: "choice" as const, accounts };
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
          OutboundRequestRefused: () => Effect.fail(new PlatformUnavailable()),
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
        // LinkedIn answers the refresh token again; its year does not
        // start over.
        refreshToken: Option.fromUndefinedOr(answer.refresh_token).pipe(
          Option.map((refreshToken) => Redacted.make(refreshToken)),
          Option.orElse(() => tokens.refreshToken)
        ),
        renewable: true,
        scopes: scopesOf(answer, channel.scopes),
      };

      return renewed;
    });

  const authorizer: PlatformAuthorizer = {
    begin,
    complete,
    connection: "linkedinPage",
    platform: "linkedin",
    policy: tokenPolicies.linkedinPage,
    refresh,
  };

  return authorizer;
});
