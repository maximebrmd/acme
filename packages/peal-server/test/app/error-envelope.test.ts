import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { HttpRouter, HttpServer, HttpServerResponse } from "effect/http";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
} from "effect/http-api";
import { errorEnvelope, PostNotFound } from "peal-contract";

import { ApiAnswersLive } from "#app/answers.ts";
import { requestIdHeader } from "#app/request-identity.ts";

// An error no contract declares, which the catalogue does not know.
class Stuck extends Schema.TaggedError<Stuck>()(
  "StuckInTraffic",
  { ...errorEnvelope, since: Schema.String },
  { httpApiStatus: 409 }
) {}

const TestApi = HttpApi.make("test").add(
  HttpApiGroup.make("things").add(
    HttpApiEndpoint.post("make", "/api/things/:thingId", {
      error: [PostNotFound, Stuck],
      params: { thingId: Schema.String.check(Schema.isUUID()) },
      payload: Schema.Struct({
        count: Schema.Int,
        name: Schema.String,
        targets: Schema.Array(Schema.Struct({ channelId: Schema.String })),
      }),
      success: Schema.Struct({ made: Schema.String }),
    }),
    HttpApiEndpoint.get("hidden", "/api/hidden", {
      error: HttpApiError.NotFound,
      success: Schema.String,
    }),
    HttpApiEndpoint.get("broken", "/api/broken", { success: Schema.String })
  )
);

const Things = HttpApiBuilder.group(TestApi, "things", (handlers) =>
  handlers
    .handle("make", ({ payload }) => {
      if (payload.name === "missing") {
        return Effect.fail(new PostNotFound());
      }

      if (payload.name === "stuck") {
        return Effect.fail(
          new Stuck({ message: "Stuck since noon.", since: "noon" })
        );
      }

      return Effect.succeed({ made: payload.name });
    })
    .handle("hidden", () => Effect.fail(new HttpApiError.NotFound()))
    .handle("broken", () =>
      Effect.die(new Error("the password is hunter2-synthetic"))
    )
);

// Routes of another kind, whose answers have their own shapes.
const Others = HttpRouter.use((router) =>
  Effect.all([
    router.add(
      "GET",
      "/api/auth/session",
      HttpServerResponse.jsonUnsafe({ code: "NOPE" }, { status: 401 })
    ),
    router.add(
      "POST",
      "/api/mcp",
      HttpServerResponse.jsonUnsafe({ jsonrpc: "2.0" }, { status: 403 })
    ),
  ])
);

const thing = "/api/things/018f4e9a-7b1c-7d2e-8f3a-4b5c6d7e8f90";

const valid = { count: 1, name: "bell", targets: [{ channelId: "one" }] };

const sending = (body: Schema.Json) => JSON.stringify(body);

const BodySchema = Schema.Record(Schema.String, Schema.Unknown);

const decodeBody = Schema.decodeUnknownSync(Schema.fromJsonString(BodySchema));

const serving = () =>
  HttpRouter.toWebHandler(
    Layer.mergeAll(
      HttpApiBuilder.layer(TestApi).pipe(Layer.provide(Things)),
      Others,
      ApiAnswersLive
    ).pipe(Layer.provide(HttpServer.layerServices)),
    { disableLogger: true }
  );

const call = (
  handler: (request: Request) => Promise<Response>,
  path: string,
  body?: string
) =>
  Effect.promise(async () => {
    const response = await handler(
      new Request(
        `http://localhost${path}`,
        body === undefined
          ? {}
          : {
              body,
              headers: { "content-type": "application/json" },
              method: "POST",
            }
      )
    );

    const text = await response.text();

    return {
      body: text === "" ? undefined : decodeBody(text),
      id: response.headers.get(requestIdHeader),
      status: response.status,
      type: response.headers.get("content-type"),
    };
  });

describe("the error envelope", () => {
  it.effect(
    "names a declared error by its code, says what it means and quotes the request",
    () =>
      Effect.gen(function* declared() {
        const { dispose, handler } = serving();

        const missing = yield* call(
          handler,
          thing,
          sending({ ...valid, name: "missing" })
        );

        const stuck = yield* call(
          handler,
          thing,
          sending({ ...valid, name: "stuck" })
        );

        const made = yield* call(handler, thing, sending(valid));

        yield* Effect.promise(dispose);

        assert.strictEqual(missing.status, 404);
        assert.strictEqual(missing.body?.["_tag"], "PostNotFound");
        assert.strictEqual(missing.body?.["code"], "post_not_found");
        assert.strictEqual(missing.body?.["requestId"], missing.id);
        assert.isString(missing.body?.["message"]);
        assert.isAbove(String(missing.body?.["message"]).length, 10);

        // Its own words and fields stay; a tag the catalogue lacks still
        // gets its code.
        assert.deepStrictEqual(stuck.body, {
          _tag: "StuckInTraffic",
          code: "stuck_in_traffic",
          message: "Stuck since noon.",
          requestId: stuck.id,
          since: "noon",
        });

        // An answer that is not an error is left as it is.
        assert.deepStrictEqual(made.body, { made: "bell" });
      })
  );

  it.effect(
    "says what is wrong with a request it could not read, and where",
    () =>
      Effect.gen(function* invalid() {
        const { dispose, handler } = serving();

        const answer = yield* call(
          handler,
          thing,
          sending({
            count: "three",
            name: "bell",
            targets: [{ channelId: "one" }, {}],
          })
        );

        const badId = yield* call(
          handler,
          "/api/things/not-an-id",
          sending(valid)
        );

        const notJson = yield* call(handler, thing, "{not json");

        yield* Effect.promise(dispose);

        assert.strictEqual(answer.status, 400);
        assert.strictEqual(answer.type, "application/json");
        assert.strictEqual(answer.body?.["_tag"], "InvalidRequest");
        assert.strictEqual(answer.body?.["code"], "invalid_request");
        assert.strictEqual(answer.body?.["requestId"], answer.id);
        assert.strictEqual(answer.body?.["field"], "body.count");

        const issues = Schema.decodeUnknownSync(
          Schema.Array(
            Schema.Struct({
              message: Schema.String,
              path: Schema.Array(Schema.Union([Schema.String, Schema.Number])),
            })
          )
        )(answer.body?.["issues"]);

        // Reading stops at the first problem: the list holds that one at
        // least.
        assert.deepStrictEqual(issues[0]?.path, ["body", "count"]);
        assert.isAbove(issues[0]?.message.length ?? 0, 0);

        assert.strictEqual(badId.status, 400);
        assert.strictEqual(badId.body?.["field"], "path.thingId");

        assert.strictEqual(notJson.status, 400);
        assert.strictEqual(notJson.body?.["code"], "invalid_request");
      })
  );

  it.effect(
    "answers a missing route and a hidden one alike, and a bug without its words",
    () =>
      Effect.gen(function* general() {
        const { dispose, handler } = serving();

        const missing = yield* call(handler, "/api/nowhere");
        const hidden = yield* call(handler, "/api/hidden");
        const broken = yield* call(handler, "/api/broken");

        yield* Effect.promise(dispose);

        assert.strictEqual(missing.status, 404);
        assert.strictEqual(hidden.status, 404);
        assert.strictEqual(missing.body?.["code"], "not_found");

        assert.deepStrictEqual(
          { ...missing.body, requestId: "" },
          { ...hidden.body, requestId: "" }
        );

        assert.strictEqual(broken.status, 500);
        assert.strictEqual(broken.body?.["code"], "internal_error");
        assert.strictEqual(broken.body?.["requestId"], broken.id);
        assert.notInclude(JSON.stringify(broken.body), "hunter2");
      })
  );

  it.effect(
    "leaves the sign-in routes' and the MCP endpoint's own answers",
    () =>
      Effect.gen(function* others() {
        const { dispose, handler } = serving();

        const auth = yield* call(handler, "/api/auth/session");
        const mcp = yield* call(handler, "/api/mcp", "{}");

        yield* Effect.promise(dispose);

        assert.deepStrictEqual(auth.body, { code: "NOPE" });
        assert.deepStrictEqual(mcp.body, { jsonrpc: "2.0" });
        assert.isNotNull(auth.id);
        assert.isNotNull(mcp.id);
      })
  );
});
