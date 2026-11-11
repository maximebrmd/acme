// The documents that let a program find the API and the MCP endpoint
// without being told where they are: the API catalogue (RFC 9727), the
// OpenAPI document, the MCP server card (SEP-2127) and llms.txt.
import { assert, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { openApiDocument } from "peal-contract/openapi-document";

import {
  bodyOf,
  origin,
  TestApp,
  unconfirmedEmails,
} from "#test/workspace/integration/harness.ts";

const docs = "https://docs.peal.example";

const Test = TestApp.layerWith({ ...unconfirmedEmails, PEAL_DOCS_URL: docs });

const LinkSchema = Schema.Struct({
  href: Schema.String,
  type: Schema.optionalKey(Schema.String),
});

const Links = Schema.optionalKey(Schema.Array(LinkSchema));

// A Linkset (RFC 9264), as far as an API catalogue uses it.
const CatalogueSchema = Schema.Struct({
  linkset: Schema.Array(
    Schema.Struct({
      anchor: Schema.String,
      "service-desc": Links,
      "service-doc": Links,
      "service-meta": Links,
      status: Links,
    })
  ),
});

// The server card's schema (SEP-2127), as far as Peal fills it.
const ServerCardSchema = Schema.Struct({
  $schema: Schema.Literal(
    "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json"
  ),
  description: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(100)
  ),
  name: Schema.String.check(
    Schema.isPattern(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/u),
    Schema.isMinLength(3),
    Schema.isMaxLength(200)
  ),
  remotes: Schema.Array(
    Schema.Struct({
      headers: Schema.Array(
        Schema.Struct({
          description: Schema.String,
          isRequired: Schema.Boolean,
          isSecret: Schema.Boolean,
          name: Schema.String,
        })
      ),
      supportedProtocolVersions: Schema.Array(Schema.String),
      type: Schema.Literal("streamable-http"),
      url: Schema.String,
    })
  ),
  title: Schema.String.check(Schema.isMaxLength(100)),
  version: Schema.String,
  websiteUrl: Schema.String,
});

const OpenApiSchema = Schema.Struct({
  openapi: Schema.String,
  paths: Schema.Record(Schema.String, Schema.Json),
});

layer(Test, { excludeTestServices: true, timeout: "120 seconds" })(
  "the discovery documents",
  (it) => {
    it.effect("lists the API and the MCP endpoint in an API catalogue", () =>
      Effect.gen(function* catalogue() {
        const app = yield* TestApp;
        const reply = yield* app.request("/.well-known/api-catalog");

        assert.strictEqual(reply.status, 200);
        assert.strictEqual(
          reply.headers.get("content-type"),
          'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"'
        );

        const { linkset } = yield* bodyOf(CatalogueSchema, reply);

        assert.deepStrictEqual(linkset, [
          {
            anchor: `${origin}/api`,
            "service-desc": [
              {
                href: `${origin}/api/openapi.json`,
                type: "application/openapi+json",
              },
            ],
            "service-doc": [
              { href: `${docs}/api-overview`, type: "text/html" },
            ],
            "service-meta": [
              {
                href: `${origin}/.well-known/oauth-protected-resource/api`,
                type: "application/json",
              },
            ],
            status: [{ href: `${origin}/api/health` }],
          },
          {
            anchor: `${origin}/api/mcp`,
            "service-desc": [
              {
                href: `${origin}/api/mcp/server-card`,
                type: "application/mcp-server-card+json",
              },
            ],
            "service-doc": [{ href: `${docs}/mcp`, type: "text/html" }],
            "service-meta": [
              {
                href: `${origin}/.well-known/oauth-protected-resource/api/mcp`,
                type: "application/json",
              },
            ],
          },
        ]);

        // Every address it gives answers.
        const answers = yield* Effect.forEach(
          linkset
            .flatMap((entry) => [
              ...(entry["service-desc"] ?? []),
              ...(entry["service-meta"] ?? []),
              ...(entry.status ?? []),
            ])
            .map(({ href }) => href.slice(origin.length)),
          (path) => app.request(path).pipe(Effect.map(({ status }) => status))
        );

        assert.isEmpty(answers.filter((status) => status >= 300));

        // HEAD says where the catalogue is.
        const head = yield* Effect.promise(
          async () =>
            await app.handler(
              new Request(`${origin}/.well-known/api-catalog`, {
                method: "HEAD",
              })
            )
        );

        assert.strictEqual(head.status, 200);
        assert.strictEqual(
          head.headers.get("link"),
          `<${origin}/.well-known/api-catalog>; rel="api-catalog"`
        );
      })
    );

    it.effect("serves the OpenAPI document where the catalogue says", () =>
      Effect.gen(function* openApi() {
        const app = yield* TestApp;
        const reply = yield* app.request("/api/openapi.json");

        const document = yield* bodyOf(OpenApiSchema, reply);

        assert.strictEqual(document.openapi, "3.1.0");
        assert.property(document.paths, "/api/workspaces/{workspaceId}/posts");

        // The one the contract writes for the docs, events included, and
        // the same where the server alone answers.
        const served = Schema.decodeUnknownSync(Schema.Json)(reply.body);

        const written = Schema.decodeUnknownSync(
          Schema.fromJsonString(Schema.Json)
        )(JSON.stringify(openApiDocument()));

        const own = yield* app.request("/openapi.json");

        assert.deepStrictEqual(served, written);
        assert.deepStrictEqual(own.body, written);
      })
    );

    it.effect(
      "describes the MCP endpoint in a server card any page may read and cache",
      () =>
        Effect.gen(function* card() {
          const app = yield* TestApp;
          const reply = yield* app.request("/api/mcp/server-card");

          assert.strictEqual(reply.status, 200);
          assert.strictEqual(
            reply.headers.get("content-type"),
            "application/mcp-server-card+json"
          );
          assert.strictEqual(
            reply.headers.get("access-control-allow-origin"),
            "*"
          );
          assert.strictEqual(
            reply.headers.get("access-control-expose-headers"),
            "ETag"
          );
          assert.strictEqual(
            reply.headers.get("cache-control"),
            "public, max-age=3600"
          );

          const described = yield* bodyOf(ServerCardSchema, reply);

          assert.strictEqual(described.name, "social.peal/peal");
          assert.strictEqual(described.websiteUrl, origin);

          const [remote] = described.remotes;

          assert.strictEqual(remote?.url, `${origin}/api/mcp`);
          assert.deepStrictEqual(remote?.supportedProtocolVersions, [
            "2026-07-28",
            "2025-11-25",
            "2025-06-18",
          ]);

          // The credential is a header the client fills: never a value.
          assert.deepStrictEqual(
            remote?.headers.map(({ isSecret, name }) => [name, isSecret]),
            [["Authorization", true]]
          );
          assert.notInclude(JSON.stringify(described), "peal_");

          // Unchanged since: nothing is sent again.
          const etag = reply.headers.get("etag") ?? "";

          assert.match(etag, /^"[\da-f]{64}"$/u);

          const again = yield* app.request("/api/mcp/server-card", {
            headers: { "if-none-match": etag },
          });

          assert.strictEqual(again.status, 304);
        })
    );

    it.effect("tells language models where everything is, in llms.txt", () =>
      Effect.gen(function* llms() {
        const app = yield* TestApp;
        const reply = yield* app.request("/llms.txt");

        assert.strictEqual(reply.status, 200);
        assert.strictEqual(
          reply.headers.get("content-type"),
          "text/markdown; charset=utf-8"
        );

        const text = yield* bodyOf(Schema.String, reply);
        const lines = text.split("\n");

        // The format: a title, a summary in a quote, then sections of
        // links.
        assert.strictEqual(lines[0], "# Peal");
        assert.isTrue(lines[2]?.startsWith("> "));
        assert.include(text, "\n## API\n");
        assert.include(text, "\n## Agents\n");
        assert.include(text, "\n## Documentation\n");

        const links = [
          ...text.matchAll(/^- \[[^\]]+\]\((?<url>[^)]+)\)/gmu),
        ].map((match) => match.groups?.["url"] ?? "");

        assert.isAbove(links.length, 6);
        assert.include(links, `${origin}/api/openapi.json`);
        assert.include(links, `${origin}/api/mcp`);
        assert.include(links, `${docs}/api-conventions`);

        for (const link of links) {
          assert.isTrue(
            link.startsWith(`${origin}/`) || link.startsWith(`${docs}/`),
            link
          );
        }
      })
    );
  }
);
