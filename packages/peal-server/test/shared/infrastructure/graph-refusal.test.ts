import { assert, describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Duration, Effect, Option } from "effect";
import type { Schema } from "effect";
import { Headers, HttpClientRequest, HttpClientResponse } from "effect/http";

import { graphRefusalOf } from "#shared/infrastructure/platforms/graph-refusal.ts";
import { graphUsageOf } from "#shared/infrastructure/platforms/graph-usage.ts";
import {
  metaAppConfig,
  threadsAppConfig,
} from "#shared/infrastructure/platforms/meta-apps.ts";

// A body Meta could send, or none.
type Body = typeof Schema.Json.Type | undefined;

const answer = (
  status: number,
  body: Body,
  headers: Readonly<Record<string, string>> = {}
) =>
  HttpClientResponse.fromWeb(
    HttpClientRequest.get("https://graph.facebook.test/v27.0/me"),
    new Response(body === undefined ? null : JSON.stringify(body), {
      headers,
      status,
    })
  );

const graphError = (
  code: number,
  extra: Readonly<Record<string, boolean | number>> = {}
) => ({
  error: { code, fbtrace_id: "synthetic", message: "synthetic", ...extra },
});

const refusalOf = (
  status: number,
  body: Body,
  headers: Readonly<Record<string, string>> = {}
) => graphRefusalOf(answer(status, body, headers));

describe(graphUsageOf, () => {
  it("reads the highest usage and the longest wait Meta reports", () => {
    const usage = graphUsageOf(
      Headers.fromInput({
        "x-app-usage": JSON.stringify({
          call_count: 28,
          total_cputime: 25,
          total_time: 12,
        }),
        "x-business-use-case-usage": JSON.stringify({
          "1020": [
            {
              call_count: 100,
              estimated_time_to_regain_access: 7,
              total_cputime: 4,
              total_time: 5,
              type: "pages",
            },
          ],
          "1784": [
            {
              call_count: 3,
              estimated_time_to_regain_access: 19,
              type: "instagram",
            },
          ],
        }),
      })
    );

    expect(
      usage.pipe(Option.map(({ highestPercent }) => highestPercent))
    ).toStrictEqual(Option.some(100));
    expect(
      usage.pipe(Option.flatMap(({ regainAccessIn }) => regainAccessIn))
    ).toStrictEqual(Option.some(Duration.minutes(19)));
  });

  it("reads nothing from answers without usage headers, or malformed ones", () => {
    expect(graphUsageOf(Headers.empty)).toStrictEqual(Option.none());
    expect(
      graphUsageOf(Headers.fromInput({ "x-app-usage": "not json" }))
    ).toStrictEqual(Option.none());
  });

  it("gives no wait when access is not cut", () => {
    const usage = graphUsageOf(
      Headers.fromInput({
        "x-app-usage": JSON.stringify({ call_count: 40 }),
      })
    );

    expect(
      usage.pipe(Option.flatMap(({ regainAccessIn }) => regainAccessIn))
    ).toStrictEqual(Option.none());
  });
});

describe(graphRefusalOf, () => {
  it.effect(
    "takes tokens, sessions, permissions and lost roles as the token",
    () =>
      Effect.gen(function* tokens() {
        for (const code of [190, 102, 10, 200, 299, 492]) {
          assert.deepStrictEqual(
            (yield* refusalOf(400, graphError(code)))._tag,
            "token"
          );
        }

        assert.strictEqual(
          (yield* refusalOf(400, graphError(190, { error_subcode: 463 })))._tag,
          "token"
        );
      })
  );

  it.effect("takes every rate limit code as one, with Meta's wait", () =>
    Effect.gen(function* limits() {
      for (const code of [4, 17, 32, 613, 368, 80_001, 80_002]) {
        assert.strictEqual(
          (yield* refusalOf(400, graphError(code)))._tag,
          "rateLimited"
        );
      }

      const waited = yield* refusalOf(400, graphError(80_001), {
        "x-business-use-case-usage": JSON.stringify({
          "1020": [{ estimated_time_to_regain_access: 12, type: "pages" }],
        }),
      });

      assert.deepStrictEqual(waited, {
        _tag: "rateLimited",
        retryAfter: Option.some(Duration.minutes(12)),
      });

      const told = yield* refusalOf(429, undefined, { "retry-after": "30" });

      assert.deepStrictEqual(told, {
        _tag: "rateLimited",
        retryAfter: Option.some(Duration.seconds(30)),
      });

      // Instagram's content publishing limit.
      assert.strictEqual(
        (yield* refusalOf(400, graphError(9, { error_subcode: 2_207_042 })))
          ._tag,
        "rateLimited"
      );
    })
  );

  it.effect("takes Meta's own failures as unavailable", () =>
    Effect.gen(function* unavailable() {
      for (const refusal of [
        refusalOf(500, graphError(1)),
        refusalOf(400, graphError(2)),
        refusalOf(400, graphError(100, { is_transient: true })),
        refusalOf(503, undefined),
        refusalOf(502, "<html>Bad gateway</html>"),
      ]) {
        assert.strictEqual((yield* refusal)._tag, "unavailable");
      }
    })
  );

  it.effect("names duplicates and other refusals by Meta's code", () =>
    Effect.gen(function* refused() {
      assert.strictEqual(
        (yield* refusalOf(400, graphError(506)))._tag,
        "duplicate"
      );
      assert.deepStrictEqual(
        yield* refusalOf(400, graphError(100, { error_subcode: 1_609_005 })),
        { _tag: "refused", code: "graph100.1609005" }
      );
      assert.deepStrictEqual(yield* refusalOf(404, undefined), {
        _tag: "refused",
        code: "http404",
      });
      assert.strictEqual((yield* refusalOf(401, undefined))._tag, "token");
    })
  );

  it.effect("reads the Threads token endpoints' own error body", () =>
    Effect.gen(function* threads() {
      assert.strictEqual(
        (yield* refusalOf(400, {
          code: 190,
          error_message: "synthetic",
          error_type: "OAuthException",
        }))._tag,
        "token"
      );
    })
  );
});

const read = (settings: Readonly<Record<string, string>>) =>
  Effect.all([metaAppConfig, threadsAppConfig]).pipe(
    Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(settings)))
  );

describe("the Meta app settings", () => {
  it.effect("are off when unset or blank", () =>
    Effect.gen(function* off() {
      const [meta, threads] = yield* read({ META_APP_ID: " " });

      assert.isTrue(Option.isNone(meta));
      assert.isTrue(Option.isNone(threads));
    })
  );

  it.effect("read an app's id and secret together", () =>
    Effect.gen(function* both() {
      const [meta, threads] = yield* read({
        META_APP_ID: "1234567890",
        META_APP_SECRET: "synthetic-secret",
      });

      assert.strictEqual(
        meta.pipe(
          Option.map(({ appId }) => appId),
          Option.getOrNull
        ),
        "1234567890"
      );
      assert.isTrue(Option.isNone(threads));
    })
  );

  it.effect("stop the server on an id without its secret, or a bad id", () =>
    Effect.gen(function* invalid() {
      for (const settings of [
        { THREADS_APP_ID: "1234567890" },
        { META_APP_SECRET: "synthetic-secret" },
        { META_APP_ID: "not-an-id", META_APP_SECRET: "synthetic-secret" },
      ]) {
        const failure = yield* Effect.flip(read(settings));

        assert.strictEqual(failure._tag, "InvalidMetaSettings");
      }
    })
  );
});
