import { assert, describe, it } from "@effect/vitest";
import { Effect, Metric } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";

import { countRequests, httpRequests } from "#app/request-metrics.ts";

const countOf = (status: string) =>
  Metric.value(Metric.withAttributes(httpRequests, { status })).pipe(
    Effect.map(({ count }) => count)
  );

const counts = Effect.all({
  "2xx": countOf("2xx"),
  "4xx": countOf("4xx"),
  "5xx": countOf("5xx"),
});

// Three routes: one answers, one refuses the caller, one breaks.
const Routes = HttpRouter.use((router) =>
  Effect.all([
    router.add("GET", "/api/health", HttpServerResponse.text("ok")),
    router.add(
      "GET",
      "/api/forbidden",
      HttpServerResponse.empty({ status: 403 })
    ),
    router.add("GET", "/api/broken", Effect.die("a bug")),
  ])
);

describe("counting requests", () => {
  it.effect(
    "counts every request the server answers by status class, traced or not",
    () =>
      Effect.gen(function* counted() {
        const before = yield* counts;

        const { dispose, handler } = HttpRouter.toWebHandler(Routes, {
          disableLogger: true,
          middleware: countRequests,
        });

        const statuses = yield* Effect.forEach(
          ["health", "health", "forbidden", "missing", "broken"],
          (path) =>
            Effect.promise(async () => {
              const response = await handler(
                new Request(`http://localhost/api/${path}`)
              );

              return response.status;
            }),
          { concurrency: 1 }
        );

        yield* Effect.promise(dispose);

        assert.deepStrictEqual(statuses, [200, 200, 403, 404, 500]);

        const after = yield* counts;

        assert.deepStrictEqual(
          {
            "2xx": after["2xx"] - before["2xx"],
            "4xx": after["4xx"] - before["4xx"],
            "5xx": after["5xx"] - before["5xx"],
          },
          { "2xx": 2, "4xx": 2, "5xx": 1 }
        );
      })
  );
});
