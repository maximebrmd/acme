import type { Option } from "effect";
import { Effect, Redacted, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

// What the channels and publishing contexts share of WordPress's REST API
// (developer.wordpress.org/rest-api): how a route is written under the
// root discovery found, how an application password is sent, and how the
// site's own errors look.

/**
 * The address of `route` (such as `/wp/v2/posts`) under the API's root,
 * with `query`. A site with pretty permalinks serves its root as
 * `…/wp-json/` and routes below it; one without names the route in the
 * `rest_route` parameter (`…/?rest_route=/`), which discovery says, so
 * both forms are kept as the root has them.
 */
export const routeUrl = (
  root: string,
  route: string,
  query: Readonly<Record<string, string>> = {}
): URL => {
  const url = new URL(root);
  const restRoute = url.searchParams.get("rest_route");
  const relative = route.replace(/^\/+/u, "");

  if (restRoute === null) {
    url.pathname = `${url.pathname.replace(/\/*$/u, "/")}${relative}`;
  } else {
    url.searchParams.set(
      "rest_route",
      `${restRoute.replace(/\/*$/u, "/")}${relative}`
    );
  }

  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, value);
  }

  return url;
};

/**
 * Signs a request with the site's credential, kept as `user:password`: an
 * application password goes as HTTP Basic authentication (RFC 7617),
 * which WordPress takes over HTTPS only.
 */
export const withSiteCredential =
  (credential: Redacted.Redacted) =>
  (request: HttpClientRequest.HttpClientRequest) => {
    const written = Redacted.value(credential);
    const colon = written.indexOf(":");

    return request.pipe(
      HttpClientRequest.basicAuth(
        written.slice(0, colon),
        Redacted.make(written.slice(colon + 1))
      ),
      HttpClientRequest.acceptJson
    );
  };

/** An error as WordPress's REST API answers one. */
export const WordPressErrorSchema = Schema.Struct({
  code: Schema.String,
  message: Schema.optionalKey(Schema.String),
});

export type WordPressError = typeof WordPressErrorSchema.Type;

/**
 * The site's own error in the answer, if it is one: only then is a 401 or
 * a 403 the site refusing the credential, rather than a proxy or a
 * security layer in front of it.
 */
export const wordpressErrorOf = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<Option.Option<WordPressError>> =>
  HttpClientResponse.schemaBodyJson(WordPressErrorSchema)(response).pipe(
    Effect.option
  );

/** The namespace of the core endpoints Peal calls. */
export const coreNamespace = "wp/v2";
