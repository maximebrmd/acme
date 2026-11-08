import { assert, layer } from "@effect/vitest";
import { Api, DatabaseUnavailable } from "acme-contract";
import { ConfigProvider, Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import { SystemHandlers } from "#app/system.ts";
import { SqlLive } from "#shared/infrastructure/database.ts";

const makeClient = HttpApiTest.groups(Api, ["system"]);

const handlersWith = (database: typeof SqlLive) =>
  Layer.mergeAll(SystemHandlers, HttpServer.layerServices).pipe(
    Layer.provide(database)
  );

// Nothing listens on port 1, so every connection is refused.
const UnreachableDatabase = SqlLive.pipe(
  Layer.provide(
    ConfigProvider.layer(
      ConfigProvider.fromUnknown({
        DATABASE_URL: "postgres://acme:acme@127.0.0.1:1/acme",
      })
    )
  )
);

// DATABASE_URL comes from the environment.
layer(handlersWith(SqlLive))("SystemApi with its database", (it) => {
  it.effect("answers the health check", () =>
    Effect.gen(function* healthCheck() {
      const client = yield* makeClient;

      assert.isUndefined(yield* client.health());
    })
  );

  it.effect("is ready", () =>
    Effect.gen(function* ready() {
      const client = yield* makeClient;

      assert.isUndefined(yield* client.ready());
    })
  );
});

layer(handlersWith(UnreachableDatabase))(
  "SystemApi without its database",
  (it) => {
    it.effect("still answers the health check", () =>
      Effect.gen(function* healthCheck() {
        const client = yield* makeClient;

        assert.isUndefined(yield* client.health());
      })
    );

    it.effect("is not ready", () =>
      Effect.gen(function* notReady() {
        const client = yield* makeClient;

        const error = yield* Effect.flip(client.ready());

        assert.instanceOf(error, DatabaseUnavailable);
      })
    );

    it.effect("answers 503 Service Unavailable", () =>
      Effect.gen(function* serviceUnavailable() {
        const client = yield* makeClient;

        const response = yield* client.ready({ responseMode: "response-only" });

        assert.strictEqual(response.status, 503);
      })
    );
  }
);
