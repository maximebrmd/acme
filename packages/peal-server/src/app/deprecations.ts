import { Context, Option } from "effect";
import { HttpApi } from "effect/http-api";
import type { HttpApiGroup } from "effect/http-api";
import { Deprecation } from "peal-contract";
import type { DeprecationNotice } from "peal-contract";

/** A deprecated endpoint, as requests are matched against it. */
interface DeprecatedRoute {
  readonly headers: Readonly<Record<string, string>>;
  readonly method: string;
  readonly path: RegExp;
}

// An HTTP-date (RFC 9110), as `Sunset` takes it.
const httpDate = (instant: string) => new Date(instant).toUTCString();

// Seconds since the epoch, as a structured field's Date (RFC 9651).
const fieldDate = (instant: string) =>
  `@${String(Math.floor(new Date(instant).getTime() / 1000))}`;

/**
 * The headers that tell a caller an endpoint is deprecated: `Deprecation`
 * (RFC 9745) with the instant it was, `Sunset` (RFC 8594) with the instant
 * it stops answering when that is decided, and a `Link` to where it is
 * explained when there is one.
 */
export const deprecationHeaders = (
  notice: DeprecationNotice
): Readonly<Record<string, string>> => {
  const headers = new Map([["deprecation", fieldDate(notice.since)]]);

  if (notice.sunset !== undefined) {
    headers.set("sunset", httpDate(notice.sunset));
  }

  if (notice.link !== undefined) {
    headers.set(
      "link",
      `<${notice.link}>; rel="deprecation"; type="text/html"`
    );
  }

  return Object.fromEntries(headers);
};

// A route's path as a pattern: each `:parameter` is one segment.
const patternOf = (path: string) =>
  new RegExp(
    `^${path
      .split("/")
      .map((segment) =>
        segment.startsWith(":")
          ? "[^/]+"
          : segment.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)
      )
      .join("/")}$`,
    "u"
  );

/**
 * The deprecated endpoints of an API, read from its contract: those
 * annotated with `deprecated(...)`. Answers to them carry the headers,
 * whatever they are.
 */
export const deprecatedRoutes = <
  Id extends string,
  Groups extends HttpApiGroup.Constraint,
>(
  api: HttpApi.HttpApi<Id, Groups>
): readonly DeprecatedRoute[] => {
  const routes: DeprecatedRoute[] = [];

  HttpApi.reflect(api, {
    onEndpoint: ({ endpoint, mergedAnnotations }) => {
      const notice = Context.getOption(mergedAnnotations, Deprecation);

      if (Option.isSome(notice)) {
        routes.push({
          headers: deprecationHeaders(notice.value),
          method: endpoint.method,
          path: patternOf(endpoint.path),
        });
      }
    },
    onGroup: () => {
      // Deprecations are declared on endpoints.
    },
  });

  return routes;
};

/** The deprecation headers of the endpoint a request reaches, if any. */
export const deprecationOf = (
  routes: readonly DeprecatedRoute[],
  method: string,
  path: string
): Readonly<Record<string, string>> =>
  routes.find((route) => route.method === method && route.path.test(path))
    ?.headers ?? {};
