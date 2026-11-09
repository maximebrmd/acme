import { assert, layer } from "@effect/vitest";
import { Api } from "acme-contract";
import type { ClientErrorReport } from "acme-contract";
import {
  Effect,
  Layer,
  Logger,
  Metric,
  Option,
  References,
  Schema,
} from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import {
  clientErrors,
  ClientErrorsHandlers,
} from "#app/client-errors/handlers.ts";
import { anonymousSecurityTest } from "#workspace/api/security.ts";

// The annotations of a log, which a report's are all text.
const AnnotationsSchema = Schema.Record(Schema.String, Schema.String);

const decodeAnnotations = Schema.decodeUnknownOption(AnnotationsSchema);

interface Logged {
  readonly annotations: typeof AnnotationsSchema.Type;
  readonly level: string;
}

const logged: Logged[] = [];

const capture = Logger.layer([
  Logger.make(({ fiber, logLevel }) => {
    for (const annotations of Option.toArray(
      decodeAnnotations(fiber.getRef(References.CurrentLogAnnotations))
    )) {
      logged.push({ annotations, level: logLevel });
    }
  }),
]);

// Every middleware passes: the intake has tests of its own.
const HandlersLive = Layer.mergeAll(
  ClientErrorsHandlers.pipe(Layer.provideMerge(anonymousSecurityTest)),
  HttpServer.layerServices,
  capture
);

const report: ClientErrorReport = {
  digest: "2154981321",
  kind: "boundary",
  message:
    "No workspace 5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60 for sam@example.test",
  path: "/app/5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60/calendar",
  release: "2026.11.0",
  route: "/[locale]/app/[workspaceId]/calendar",
  stack: null,
  userAgent: "Mozilla/5.0 (Synthetic)",
};

layer(HandlersLive)("the error reports' handler", (it) => {
  it.effect("logs each at error level, with OpenTelemetry's names", () =>
    Effect.gen(function* logs() {
      const client = yield* HttpApiTest.groups(Api, ["clientErrors"]);

      logged.length = 0;

      yield* client.reportClientError({ payload: report });

      const entry = logged.find(
        ({ annotations }) => annotations["event.name"] === "acme.client_error"
      );

      assert.strictEqual(entry?.level, "Error");
      assert.deepStrictEqual(entry?.annotations, {
        "acme.client_error.digest": "2154981321",
        "acme.client_error.kind": "boundary",
        "acme.web.release": "2026.11.0",
        "event.name": "acme.client_error",
        "exception.message": "No workspace [id] for [email]",
        "http.route": "/[locale]/app/[workspaceId]/calendar",
        "url.path": "/app/:id/calendar",
        "user_agent.original": "Mozilla/5.0 (Synthetic)",
      });
    })
  );

  it.effect("counts each by kind", () =>
    Effect.gen(function* counts() {
      const client = yield* HttpApiTest.groups(Api, ["clientErrors"]);
      const counter = Metric.withAttributes(clientErrors, { kind: "server" });
      const before = (yield* Metric.value(counter)).count;

      yield* client.reportClientError({
        payload: { ...report, kind: "server" },
      });

      assert.strictEqual((yield* Metric.value(counter)).count, before + 1);
    })
  );
});
