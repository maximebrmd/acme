import { Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { SiteRefused } from "#channels/application/site-refused.ts";
import { SiteVerifier } from "#channels/application/site-verifier.ts";
import type {
  SiteSignIn,
  VerifiedSite,
} from "#channels/application/site-verifier.ts";
import { AvatarUrlSchema } from "#channels/domain/avatar-url.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import {
  coreNamespace,
  routeUrl,
  withSiteCredential,
  wordpressErrorOf,
} from "#shared/infrastructure/platforms/wordpress-api.ts";

// How a WordPress site is checked, from its REST API handbook
// (developer.wordpress.org/rest-api): discovery ("Discovery": a `Link`
// header of relation `https://api.w.org/` on the site's pages, which a
// HEAD request reads; `/wp-json/` otherwise), the index (its name, home
// and namespaces), and the current user (`/wp/v2/users/me`, whose
// `capabilities` the edit context gives), with the application password
// as Basic credentials ("Authentication").

// The relation discovery names the API's root by.
const apiRelation = "https://api.w.org/";

// Redirects followed from the address typed to the site's home: each is a
// request of its own, which the outbound guard checks.
const maxRedirects = 5;

// What publishing needs of the user, and what Peal keeps of their rights.
const needed = ["publish_posts", "upload_files"] as const;

const kept = [...needed, "edit_posts", "manage_categories"] as const;

const IndexSchema = Schema.Struct({
  home: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
  namespaces: Schema.Array(Schema.String),
  site_icon_url: Schema.optionalKey(Schema.String),
  url: Schema.optionalKey(Schema.String),
});

const UserSchema = Schema.Struct({
  capabilities: Schema.Record(Schema.String, Schema.Unknown),
  id: Schema.Number,
});

const decodeAvatar = Schema.decodeUnknownOption(AvatarUrlSchema);

type Failure = PlatformUnavailable | SiteRefused;

// The public client, whose requests the outbound guard may refuse.
type PublicClient = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

const refused = (reason: SiteRefused["reason"]) => new SiteRefused({ reason });

// The address as typed, with HTTPS when it names no scheme.
const addressOf = (typed: string): Option.Option<URL> => {
  const trimmed = typed.trim();

  return Option.fromNullishOr(
    URL.parse(
      /^[a-z][a-z0-9+.-]*:\/\//iu.test(trimmed) ? trimmed : `https://${trimmed}`
    )
  ).pipe(
    Option.filter(
      (url) =>
        (url.protocol === "https:" || url.protocol === "http:") &&
        url.username === "" &&
        url.password === ""
    )
  );
};

// The link a `Link` header entry names, and its relation.
const linkPattern = /^<(?<href>[^>]+)>\s*;(?<params>.*)$/u;

const relationPattern = /rel="?(?<rel>[^";]+)"?/u;

// The root a `Link` header names with the API's relation, if any.
const rootFromLink = (header: string | undefined, base: URL) =>
  Option.fromUndefinedOr(header).pipe(
    Option.flatMap((links) =>
      Option.fromUndefinedOr(
        links
          .split(",")
          .map((link) => linkPattern.exec(link.trim())?.groups)
          .find(
            (link) =>
              relationPattern.exec(link?.["params"] ?? "")?.groups?.["rel"] ===
              apiRelation
          )?.["href"]
      )
    ),
    Option.flatMap((href) => Option.fromNullishOr(URL.parse(href, base.href)))
  );

// A transport failure, a timeout or a lookup failing for now: the site is
// down for now. The guard's refusal is the address's fault.
const sent = <A>(
  request: Effect.Effect<
    A,
    Failure | HttpClientError.HttpClientError | OutboundRequestRefused
  >
): Effect.Effect<A, Failure> =>
  request.pipe(
    Effect.catchTags({
      HttpClientError: () => Effect.fail(new PlatformUnavailable()),
      OutboundRequestRefused: ({ reason }) =>
        Effect.fail(
          reason === "lookupFailed"
            ? new PlatformUnavailable()
            : refused(
                reason === "unknownHost" ? "notWordPress" : "addressNotAllowed"
              )
        ),
    })
  );

const isDown = (status: number) => status >= 500 || status === 429;

// The home page's answer, after the redirects it gives: where the site is,
// and the root its `Link` header names.
const homeOf = Effect.fnUntraced(function* homeOf(
  http: PublicClient,
  start: URL
) {
  let at = start;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const response = yield* http.execute(HttpClientRequest.head(at)).pipe(sent);
    const { location } = response.headers;

    if (
      response.status >= 300 &&
      response.status < 400 &&
      location !== undefined
    ) {
      const next = URL.parse(location, at.href);

      if (next === null) {
        return yield* refused("notWordPress");
      }

      at = next;
      continue;
    }

    if (isDown(response.status)) {
      return yield* new PlatformUnavailable();
    }

    return { at, linked: rootFromLink(response.headers["link"], at) };
  }

  return yield* refused("notWordPress");
});

// The index at the root, if it is WordPress's: its core namespace.
const indexAt = Effect.fnUntraced(function* indexAt(
  http: PublicClient,
  root: URL
) {
  const response = yield* http
    .execute(
      HttpClientRequest.get(
        routeUrl(root.href, "/", {
          _fields: "home,name,namespaces,site_icon_url,url",
        })
      ).pipe(HttpClientRequest.acceptJson)
    )
    .pipe(sent);

  if (isDown(response.status)) {
    return yield* new PlatformUnavailable();
  }

  if (response.status !== 200) {
    return Option.none();
  }

  return yield* HttpClientResponse.schemaBodyJson(IndexSchema)(response).pipe(
    Effect.option,
    Effect.map(
      Option.filter((index) => index.namespaces.includes(coreNamespace))
    )
  );
});

// The user and the password as every call to the site sends them.
const credentialOf = (signIn: SiteSignIn) =>
  Redacted.make(
    `${signIn.userName.trim()}:${Redacted.value(signIn.applicationPassword).trim()}`
  );

// The site's home without its scheme or the slash that ends it: what
// members call the site.
const handleOf = (home: URL) =>
  `${home.host}${home.pathname.replace(/\/+$/u, "")}`;

/**
 * SiteVerifier for WordPress: finds the site's REST API, checks that it
 * is WordPress's, then that the user and the application password open
 * it with the rights publishing needs. Every request goes through the
 * public HTTP client and the outbound guard, redirects included, which
 * are followed one request at a time.
 */
export const WordPressSiteVerifierLive = Layer.effect(
  SiteVerifier,
  Effect.gen(function* WordPressSiteVerifierLive() {
    const http = yield* publicHttpClient;

    const verify = Effect.fn("WordPressSiteVerifier.verify")(function* verify(
      signIn: SiteSignIn
    ) {
      const start = yield* Option.match(addressOf(signIn.address), {
        onNone: () => Effect.fail(refused("notWordPress")),
        onSome: Effect.succeed,
      });

      const home = yield* homeOf(http, start);

      // The root the home page names, else the one sites with pretty
      // permalinks serve.
      const root = Option.getOrElse(
        home.linked,
        () => new URL("wp-json/", home.at.href.replace(/\/*$/u, "/"))
      );

      const index = yield* indexAt(http, root);

      if (Option.isNone(index)) {
        return yield* refused("notWordPress");
      }

      const response = yield* http
        .execute(
          HttpClientRequest.get(
            routeUrl(root.href, "/wp/v2/users/me", {
              _fields: "capabilities,id",
              context: "edit",
            })
          ).pipe(withSiteCredential(credentialOf(signIn)))
        )
        .pipe(sent);

      if (isDown(response.status)) {
        return yield* new PlatformUnavailable();
      }

      if (response.status === 401 || response.status === 403) {
        return yield* Option.match(yield* wordpressErrorOf(response), {
          // A proxy in front of the site answered: it may let Peal
          // through later.
          onNone: () => Effect.fail(new PlatformUnavailable()),
          onSome: () => Effect.fail(refused("credentialsRefused")),
        });
      }

      const user = yield* HttpClientResponse.schemaBodyJson(UserSchema)(
        response
      ).pipe(Effect.mapError(() => refused("notWordPress")));

      const granted = kept.filter(
        (capability) => user.capabilities[capability] === true
      );

      if (!needed.every((capability) => granted.includes(capability))) {
        return yield* refused("cannotPublish");
      }

      const homePage = Option.fromUndefinedOr(index.value.home).pipe(
        Option.flatMap((written) => Option.fromNullishOr(URL.parse(written))),
        Option.getOrElse(() => home.at)
      );

      const site: VerifiedSite = {
        accountId: root.href,
        avatarUrl: Option.fromUndefinedOr(index.value.site_icon_url).pipe(
          Option.filter((icon) => icon !== ""),
          Option.flatMap(decodeAvatar)
        ),
        displayName: Option.fromUndefinedOr(index.value.name).pipe(
          Option.filter((name) => name.trim() !== "")
        ),
        handle: handleOf(homePage),
        scopes: granted,
      };

      return site;
    });

    return SiteVerifier.of({ verify });
  })
);
