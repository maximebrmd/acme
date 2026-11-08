import { assert, layer } from "@effect/vitest";
import { Api } from "acme-contract";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import { SystemHandlers } from "#app/system.ts";

const makeClient = HttpApiTest.groups(Api, ["system"]);

layer(Layer.mergeAll(SystemHandlers, HttpServer.layerServices))(
  "SystemApi",
  (it) => {
    it.effect("answers the health check", () =>
      Effect.gen(function* healthCheck() {
        const client = yield* makeClient;

        const answer = yield* client.health();

        assert.isUndefined(answer);
      })
    );
  }
);
