import { Context, Option, Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/http-api";
import { Api, deprecated, Deprecation } from "peal-contract";
import { describe, expect, it } from "vitest";

import {
  deprecatedRoutes,
  deprecationHeaders,
  deprecationOf,
} from "#app/deprecations.ts";

const notice = { since: "2026-12-01T00:00:00Z" };

const Small = HttpApi.make("small").add(
  HttpApiGroup.make("things").add(
    HttpApiEndpoint.get("old", "/api/old", {
      success: Schema.String,
    }).annotateMerge(deprecated(notice)),
    HttpApiEndpoint.get("current", "/api/current", { success: Schema.String })
  )
);

// Every endpoint of an API with whether its document marks it deprecated
// and the notice its answers carry.
const marked = <Id extends string, Groups extends HttpApiGroup.Constraint>(
  api: HttpApi.HttpApi<Id, Groups>
) => {
  const endpoints: {
    readonly flagged: boolean;
    readonly name: string;
    readonly notice: Option.Option<typeof Deprecation.Service>;
  }[] = [];

  HttpApi.reflect(api, {
    onEndpoint: ({ endpoint, group, mergedAnnotations }) => {
      endpoints.push({
        flagged: Context.getOrElse(
          mergedAnnotations,
          OpenApi.Deprecated,
          () => false
        ),
        name: `${group.identifier}.${endpoint.name}`,
        notice: Context.getOption(mergedAnnotations, Deprecation),
      });
    },
    onGroup: () => {
      // Deprecations are declared on endpoints.
    },
  });

  return endpoints;
};

describe("deprecations", () => {
  it("marks a deprecated endpoint in the OpenAPI document, and no other", () => {
    const { paths } = OpenApi.fromApi(Small);

    expect(paths["/api/old"]?.get?.deprecated).toBeTruthy();
    expect(paths["/api/current"]?.get?.deprecated).toBeUndefined();
    expect(deprecatedRoutes(Small)).toHaveLength(1);
  });

  it("tells whoever asks for a deprecated endpoint, with GET or with HEAD", () => {
    const routes = deprecatedRoutes(Small);
    const told = { deprecation: "@1796083200" };

    expect(deprecationOf(routes, "GET", "/api/old")).toStrictEqual(told);
    expect(deprecationOf(routes, "HEAD", "/api/old")).toStrictEqual(told);
    expect(deprecationOf(routes, "POST", "/api/old")).toStrictEqual({});
    expect(deprecationOf(routes, "HEAD", "/api/current")).toStrictEqual({});
  });

  it("says only what is decided: no sunset, no link, until there is one", () => {
    expect(deprecationHeaders(notice)).toStrictEqual({
      deprecation: "@1796083200",
    });
  });

  it("never marks an endpoint of the API deprecated without telling its callers since when", () => {
    const endpoints = marked(Api);

    expect(endpoints.length).toBeGreaterThan(50);

    // The document's flag and the answers' headers come together, from
    // `deprecated(...)`.
    expect(
      endpoints
        .filter(({ flagged, notice: told }) => flagged !== Option.isSome(told))
        .map(({ name }) => name)
    ).toStrictEqual([]);

    // A sunset is never before the deprecation it follows (RFC 9745).
    expect(
      endpoints.flatMap(({ name, notice: told }) =>
        Option.match(told, {
          onNone: () => [],
          onSome: ({ since, sunset }) =>
            sunset !== undefined && Date.parse(sunset) < Date.parse(since)
              ? [name]
              : [],
        })
      )
    ).toStrictEqual([]);
  });
});
