import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, References } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";

import { ApiAnswersLive } from "#app/answers.ts";
import { requestIdAttribute, requestIdHeader } from "#app/request-identity.ts";

// Three routes: one answers with what its log lines are annotated with, one
// refuses the caller, one breaks.
const Routes = HttpRouter.use((router) =>
  Effect.all([
    router.add(
      "GET",
      "/api/health",
      References.CurrentLogAnnotations.pipe(
        Effect.map((annotations) =>
          HttpServerResponse.text(String(annotations[requestIdAttribute]))
        )
      )
    ),
    router.add(
      "GET",
      "/api/forbidden",
      HttpServerResponse.empty({ status: 403 })
    ),
    router.add("GET", "/api/broken", Effect.die("a bug")),
  ])
);

const serving = () =>
  HttpRouter.toWebHandler(Layer.mergeAll(Routes, ApiAnswersLive), {
    disableLogger: true,
  });

const answerTo = (
  handler: (request: Request) => Promise<Response>,
  path: string,
  sent?: string
) =>
  Effect.promise(async () => {
    const response = await handler(
      new Request(`http://localhost/api/${path}`, {
        headers: sent === undefined ? {} : { [requestIdHeader]: sent },
      })
    );

    return response.headers.get(requestIdHeader);
  });

const uuid = /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[\da-f]{4}-[\da-f]{12}$/u;

describe("request ids", () => {
  it.effect("gives every answer an id of its own, whatever its status", () =>
    Effect.gen(function* everyAnswer() {
      const { dispose, handler } = serving();

      const ids = yield* Effect.forEach(
        ["health", "forbidden", "missing", "broken"],
        (path) => answerTo(handler, path),
        { concurrency: 1 }
      );

      yield* Effect.promise(dispose);

      for (const id of ids) {
        assert.match(id ?? "", uuid);
      }

      assert.strictEqual(new Set(ids).size, ids.length);
    })
  );

  it.effect("keeps the id a caller sent when it is well formed", () =>
    Effect.gen(function* callerId() {
      const { dispose, handler } = serving();

      const kept = yield* answerTo(handler, "health", "deploy-42.attempt_3");
      const failed = yield* answerTo(handler, "broken", "deploy-42.attempt_4");

      // Too short, too long, or holding what a log line must not carry.
      const replaced = yield* Effect.forEach(
        ["short", "a".repeat(129), "two words here", 'quote"me-now'],
        (sent) => answerTo(handler, "health", sent),
        { concurrency: 1 }
      );

      yield* Effect.promise(dispose);

      assert.strictEqual(kept, "deploy-42.attempt_3");
      assert.strictEqual(failed, "deploy-42.attempt_4");

      for (const id of replaced) {
        assert.match(id ?? "", uuid);
      }
    })
  );

  it.effect("names the request in every log line written while it runs", () =>
    Effect.gen(function* logs() {
      const { dispose, handler } = serving();

      const annotated = yield* Effect.promise(async () => {
        const response = await handler(
          new Request("http://localhost/api/health", {
            headers: { [requestIdHeader]: "trace-me-0001" },
          })
        );

        return await response.text();
      });

      yield* Effect.promise(dispose);

      assert.strictEqual(annotated, "trace-me-0001");
    })
  );
});
