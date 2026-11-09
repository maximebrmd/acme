import { assert, describe, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Runtime } from "effect";
import type { HttpClient } from "effect/http";
import { TestClock } from "effect/testing";

import { runWith } from "#cli.ts";
import { HealthCheckFailed, healthTimeout } from "#commands/health.ts";

import { cliEnvironment, fetching, inMemoryServer, output } from "./support.ts";

const health = (transport: Layer.Layer<HttpClient.HttpClient>) =>
  runWith(["health"]).pipe(
    Effect.provide(Layer.mergeAll(cliEnvironment(), transport))
  );

describe("acme health", () => {
  it.effect("reports a server that answers", () =>
    Effect.gen(function* healthy() {
      yield* health(inMemoryServer(Effect.void));

      const { errors, logs } = yield* output;

      // The test clock stands still, so the round trip takes 0 ms.
      assert.deepStrictEqual(logs, [
        "The Acme API at http://localhost:3000 is healthy (0 ms).",
      ]);
      assert.deepStrictEqual(errors, []);
    })
  );

  it.effect("fails when the server answers with an error", () =>
    Effect.gen(function* unhealthy() {
      const error = yield* health(
        inMemoryServer(Effect.die("synthetic failure"))
      ).pipe(Effect.flip);

      assert.instanceOf(error, HealthCheckFailed);
      assert.strictEqual(Runtime.getErrorExitCode(error), 1);
      assert.strictEqual(error.reason, "unhealthy");

      const { errors } = yield* output;

      assert.include(
        errors.join("\n"),
        "The Acme API at http://localhost:3000 is not healthy (HTTP 500)."
      );
    })
  );

  it.effect("fails when the server is unreachable", () =>
    Effect.gen(function* unreachable() {
      const refused = fetching(() => {
        throw new TypeError("ECONNREFUSED: Unable to connect to the server");
      });

      const error = yield* health(refused).pipe(Effect.flip);

      assert.instanceOf(error, HealthCheckFailed);
      assert.strictEqual(Runtime.getErrorExitCode(error), 1);
      assert.strictEqual(error.reason, "unreachable");

      const { errors, logs } = yield* output;

      assert.deepStrictEqual(logs, []);
      assert.include(
        errors.join("\n"),
        "Cannot reach the Acme API at http://localhost:3000 (ECONNREFUSED: Unable to connect to the server)."
      );
      assert.include(errors.join("\n"), "--api-url or ACME_API_URL");
    })
  );

  it.effect("fails when the server does not answer in time", () =>
    Effect.gen(function* silent() {
      const silentServer = fetching(
        async () => await Promise.withResolvers<Response>().promise
      );

      const fiber = yield* health(silentServer).pipe(
        Effect.flip,
        Effect.forkChild
      );

      yield* TestClock.adjust(healthTimeout);

      const error = yield* Fiber.join(fiber);

      assert.instanceOf(error, HealthCheckFailed);
      assert.strictEqual(error.reason, "unreachable");
      assert.strictEqual(error.detail, "no answer within 5s");
    })
  );
});
