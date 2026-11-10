import { Config, Effect, Layer, Option } from "effect";
import { Digest } from "effect/crypto";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import { OpenApi } from "effect/http-api";
import { Api } from "peal-contract";

import { mcpProtocolVersions, mcpServerVersion } from "#app/mcp/server.ts";
import { publicUrlConfig } from "#shared/infrastructure/environment.ts";

import {
  apiCatalogue,
  cataloguePath,
  catalogueType,
  llmsText,
  openApiPath,
  serverCard,
  serverCardType,
} from "./documents.ts";

// Where the documentation is (`PEAL_DOCS_URL`), for the links the
// discovery documents give to it. Unset or empty, they give none.
const docsUrl = Config.URL("PEAL_DOCS_URL").pipe(
  Config.option,
  Config.map(Option.map((url) => url.href.replace(/\/+$/u, "")))
);

const encoder = new TextEncoder();

// The server card is read from pages of any origin, and cached (SEP-2127,
// "Discovery").
const cardHeaders = {
  "access-control-allow-headers": "Content-Type, If-None-Match",
  "access-control-allow-methods": "GET",
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "ETag",
  "cache-control": "public, max-age=3600",
};

/**
 * The documents that let a program find Peal's API and MCP endpoint, at
 * the paths their specifications give:
 *
 * - `/.well-known/api-catalog` (RFC 9727): the API catalogue, with the
 *   `Link` that names it, which a HEAD request answers alone.
 * - `/api/openapi.json`: the OpenAPI document the catalogue points to.
 * - `/api/mcp/server-card` (SEP-2127): the MCP endpoint's server card.
 * - `/llms.txt` (llmstxt.org): the same places, for a language model.
 *
 * None needs credentials, and none says anything a deployment keeps to
 * itself: they are written from PUBLIC_URL, PEAL_DOCS_URL and the contract.
 * Read when the server starts, so a malformed PEAL_DOCS_URL stops it there.
 */
export const DiscoveryLive = HttpRouter.use(
  Effect.fn(function* discovery(router) {
    const places = { docs: yield* docsUrl, origin: yield* publicUrlConfig };
    const digest = yield* Digest.Digest;

    const card = JSON.stringify(
      serverCard(places, {
        protocolVersions: mcpProtocolVersions,
        version: mcpServerVersion,
      })
    );

    const etag = `"${yield* digest
      .digestHex(Digest.sha256, encoder.encode(card))
      .pipe(Effect.orDie)}"`;

    const catalogue = JSON.stringify(apiCatalogue(places));
    const openApi = JSON.stringify(OpenApi.fromApi(Api));
    const llms = llmsText(places);

    const catalogueLink = {
      link: `<${places.origin}${cataloguePath}>; rel="api-catalog"`,
    };

    yield* router.add(
      "GET",
      cataloguePath,
      HttpServerResponse.text(catalogue, {
        contentType: catalogueType,
        headers: catalogueLink,
      })
    );

    yield* router.add(
      "GET",
      openApiPath,
      HttpServerResponse.text(openApi, { contentType: "application/json" })
    );

    yield* router.add(
      "GET",
      "/api/mcp/server-card",
      HttpServerRequest.HttpServerRequest.pipe(
        Effect.map((request) =>
          request.headers["if-none-match"] === etag
            ? HttpServerResponse.empty({
                headers: { ...cardHeaders, etag },
                status: 304,
              })
            : HttpServerResponse.text(card, {
                contentType: serverCardType,
                headers: { ...cardHeaders, etag },
              })
        )
      )
    );

    yield* router.add(
      "OPTIONS",
      "/api/mcp/server-card",
      HttpServerResponse.empty({ headers: cardHeaders, status: 204 })
    );

    yield* router.add(
      "GET",
      "/llms.txt",
      HttpServerResponse.text(llms, {
        contentType: "text/markdown; charset=utf-8",
      })
    );
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
