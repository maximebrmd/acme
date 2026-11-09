import { createServer } from "node:net";
import type { Server, Socket } from "node:net";

import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Schema } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import type { SqlClient } from "effect/sql";
import { Api, DatabaseUnavailable } from "peal-contract";

import { SystemHandlers } from "#app/system.ts";
import { SqlLive } from "#shared/infrastructure/database.ts";
import { anonymousSecurityTest } from "#workspace/api/security.ts";

const makeClient = HttpApiTest.groups(Api, ["system"]);

// The system endpoints need no credentials; the API's security middleware is
// there for the other groups.
const handlersWith = <E>(database: Layer.Layer<SqlClient.SqlClient, E>) =>
  Layer.mergeAll(
    SystemHandlers,
    HttpServer.layerServices,
    anonymousSecurityTest
  ).pipe(Layer.provide(database));

const sqlAt = (url: string) =>
  SqlLive.pipe(
    Layer.provide(
      ConfigProvider.layer(ConfigProvider.fromUnknown({ DATABASE_URL: url }))
    )
  );

// Nothing listens on port 1, so every connection is refused.
const UnreachableDatabase = sqlAt("postgres://peal:peal@127.0.0.1:1/peal");

const Address = Schema.Struct({ port: Schema.Number });

// A host that accepts connections and never answers, as behind a network
// partition: the driver connects, then waits for Postgres to speak.
const silentHost = Effect.acquireRelease(
  Effect.callback<{ readonly server: Server; readonly sockets: Set<Socket> }>(
    (resume) => {
      const sockets = new Set<Socket>();

      const server = createServer((socket) => {
        sockets.add(socket);
      });

      server.listen(0, "127.0.0.1", () => {
        resume(Effect.succeed({ server, sockets }));
      });
    }
  ),
  ({ server, sockets }) =>
    Effect.callback<undefined>((resume) => {
      for (const socket of sockets) {
        socket.destroy();
      }

      server.close(() => {
        resume(Effect.succeed(undefined));
      });
    })
);

const SilentDatabase = Layer.unwrap(
  Effect.gen(function* silentDatabase() {
    const { server } = yield* silentHost;

    const { port } = yield* Schema.decodeUnknownEffect(Address)(
      server.address()
    );

    return sqlAt(`postgres://peal:peal@127.0.0.1:${port}/peal`);
  })
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

// Live services: the probe's own timeout runs on the real clock.
layer(handlersWith(SilentDatabase), { excludeTestServices: true })(
  "SystemApi with a database that never answers",
  (it) => {
    it.effect("answers 503 before the driver gives up on the connection", () =>
      Effect.gen(function* notReadyInTime() {
        const client = yield* makeClient;

        // The driver waits five seconds for a connection; the probe answers
        // after two, without waiting for the query to be cancelled.
        const response = yield* client
          .ready({ responseMode: "response-only" })
          .pipe(Effect.timeout("4 seconds"));

        assert.strictEqual(response.status, 503);
      })
    );
  }
);
