import { createServer } from "node:http";
import type { Server } from "node:http";

import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Schema } from "effect";
import { AsyncResult, AtomRegistry, Hydration } from "effect/reactivity";

import { apiStatus, health } from "#api/health.ts";
import { prefetchEffect } from "#api/prefetch.ts";

const Address = Schema.Struct({ port: Schema.Number });

// A stand-in for the Acme server that answers the health check, on a free
// port.
const fakeApi = Effect.acquireRelease(
  Effect.callback<Server>((resume) => {
    const server = createServer((request, response) => {
      response.statusCode = request.url === "/health" ? 204 : 404;
      response.end();
    });

    server.listen(0, "127.0.0.1", () => {
      resume(Effect.succeed(server));
    });
  }),
  (server) =>
    Effect.callback<undefined>((resume) => {
      server.close(() => {
        resume(Effect.succeed(undefined));
      });
    })
);

const urlOf = (server: Server) =>
  Effect.map(
    Schema.decodeUnknownEffect(Address)(server.address()),
    ({ port }) => `http://127.0.0.1:${port}`
  );

// Renders the status the browser shows after hydrating the server's state.
const hydratedStatus = (state: Iterable<Hydration.DehydratedAtom>) => {
  const registry = AtomRegistry.make();

  Hydration.hydrate(registry, state);

  const status = apiStatus(registry.get(health));

  registry.dispose();

  return status;
};

const prefetchFrom = (url: string) =>
  prefetchEffect([health]).pipe(
    Effect.provide(
      ConfigProvider.layer(ConfigProvider.fromUnknown({ ACME_API_URL: url }))
    )
  );

describe("API status", () => {
  it("maps each result to a status", () => {
    assert.strictEqual(apiStatus(AsyncResult.initial()), "loading");
    assert.strictEqual(apiStatus(AsyncResult.success(undefined)), "healthy");
    assert.strictEqual(
      apiStatus(AsyncResult.fail(new Error("refused"))),
      "unreachable"
    );
  });

  it.live("renders healthy when the server answers", () =>
    Effect.gen(function* healthy() {
      const server = yield* fakeApi;
      const state = yield* prefetchFrom(yield* urlOf(server));

      assert.strictEqual(hydratedStatus(state), "healthy");
    }).pipe(Effect.scoped)
  );

  it.live("renders unreachable when nothing listens", () =>
    Effect.gen(function* unreachable() {
      // Take a free port, then close the server so nothing listens on it.
      const url = yield* fakeApi.pipe(Effect.flatMap(urlOf), Effect.scoped);
      const state = yield* prefetchFrom(url);

      assert.strictEqual(hydratedStatus(state), "unreachable");
    })
  );
});
