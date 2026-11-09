import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect } from "effect";
import { NextRequest } from "next/server";

import { forwardedHeader, forwardToApi, servedByApi } from "#api/forward.ts";
import { serverUrl } from "#api/server-url.ts";

const withEnv =
  (env: Record<string, string>) =>
  <A, E>(effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env)))
    );

const forward = (
  url: string,
  env: Record<string, string>,
  headers: Record<string, string> = {}
) => forwardToApi(new NextRequest(url, { headers })).pipe(withEnv(env));

const rewriteOf = (response: Response) =>
  response.headers.get("x-middleware-rewrite");

describe("forwarding /api/* to the server", () => {
  it.effect("rewrites to the server, keeping the path and query", () =>
    Effect.gen(function* rewrites() {
      const response = yield* forward(
        "http://localhost:3001/api/health?verbose=1",
        { ACME_API_URL: "http://api.test:3000/" }
      );

      assert.strictEqual(
        rewriteOf(response),
        "http://api.test:3000/api/health?verbose=1"
      );
    })
  );

  it.effect("marks the request it forwards", () =>
    Effect.gen(function* marks() {
      const response = yield* forward("http://localhost:3001/api/me", {
        ACME_API_URL: "http://api.test:3000",
      });

      assert.strictEqual(
        response.headers.get(`x-middleware-request-${forwardedHeader}`),
        "1"
      );
    })
  );

  // Were ACME_API_URL to lead back to the app under another name, the
  // forwarded request would enter the proxy again.
  it.effect(
    "refuses a request it already forwarded, so requests cannot loop",
    () =>
      Effect.gen(function* loop() {
        const response = yield* forward(
          "http://127.0.0.1:3001/api/health",
          { ACME_API_URL: "http://localhost:3001" },
          { [forwardedHeader]: "1" }
        );

        assert.strictEqual(response.status, 508);
        assert.isNull(rewriteOf(response));
      })
  );

  it.effect("refuses to forward to the app's own origin", () =>
    Effect.gen(function* ownOrigin() {
      const response = yield* forward("http://localhost:3001/api/health", {
        ACME_API_URL: "http://localhost:3001",
      });

      assert.strictEqual(response.status, 502);
      assert.isNull(rewriteOf(response));
    })
  );
});

describe("what the server answers", () => {
  it.each([
    "/api/health",
    "/api/mcp",
    "/.well-known/oauth-authorization-server/api/auth",
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/api/mcp",
  ])("%s goes to the server", (pathname) => {
    assert.isTrue(servedByApi(pathname));
  });

  it.each([
    "/",
    "/device",
    "/oauth/consent",
    "/apis",
    "/.well-known/oauth-protected-resources",
    "/.well-known/security.txt",
  ])("%s is the web app's", (pathname) => {
    assert.isFalse(servedByApi(pathname));
  });

  it.effect("forwards discovery documents with their path", () =>
    Effect.gen(function* discovery() {
      const response = yield* forward(
        "http://localhost:3001/.well-known/oauth-protected-resource/api/mcp",
        { ACME_API_URL: "http://api.test:3000" }
      );

      assert.strictEqual(
        rewriteOf(response),
        "http://api.test:3000/.well-known/oauth-protected-resource/api/mcp"
      );
    })
  );
});

describe("the server URL", () => {
  it.effect("defaults to the development server outside production", () =>
    Effect.gen(function* development() {
      assert.strictEqual(
        yield* serverUrl.pipe(withEnv({ NODE_ENV: "development" })),
        "http://localhost:3000"
      );
    })
  );

  it.effect("is required in production", () =>
    Effect.gen(function* production() {
      const missing = yield* serverUrl.pipe(
        withEnv({ NODE_ENV: "production" }),
        Effect.flip
      );

      assert.include(String(missing), "ACME_API_URL");
    })
  );

  it.effect("is read from ACME_API_URL in production", () =>
    Effect.gen(function* configured() {
      assert.strictEqual(
        yield* serverUrl.pipe(
          withEnv({
            ACME_API_URL: "http://acme-server:8080",
            NODE_ENV: "production",
          })
        ),
        "http://acme-server:8080"
      );
    })
  );
});
