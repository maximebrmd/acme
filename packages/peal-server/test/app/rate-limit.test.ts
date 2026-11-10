// The limit on how many requests a key or an application sends, through
// the whole server: counted on Postgres, told in the answers' headers,
// and refused past it with a 429 that says when to come back.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";

import {
  MigratedSqlLive,
  apiKeyOf,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

// Five requests a minute, so a test reaches the limit.
const Test = MigratedSqlLive.pipe(
  Layer.provideMerge(
    TestApp.layerWith({
      ...unconfirmedEmails,
      PEAL_API_REQUESTS_PER_MINUTE: "5",
    })
  )
);

const RefusalSchema = Schema.Struct({
  _tag: Schema.Literal("TooManyRequests"),
  code: Schema.Literal("too_many_requests"),
  limit: Schema.Literal(5),
  message: Schema.String,
  requestId: Schema.String,
  retryAfterSeconds: Schema.Int,
  windowSeconds: Schema.Literal(60),
});

// What the `RateLimit` header says is left, and for how long.
const left = /^"default";r=(?<remaining>\d+);t=(?<seconds>\d+)$/u;

layer(Test, { excludeTestServices: true, timeout: "180 seconds" })(
  "the rate limit",
  (it) => {
    it.effect(
      "counts a key's requests, says what is left, and refuses past the limit",
      () =>
        Effect.gen(function* limited() {
          const app = yield* TestApp;
          const owner = yield* signedUpUnconfirmed("limit-owner");
          const workspaceId = yield* workspaceOf(owner, "Limits");
          const path = `/api/workspaces/${workspaceId}/channels`;

          const { key } = yield* apiKeyOf(owner, workspaceId, ["channel:read"]);

          const replies = yield* Effect.forEach(
            [1, 2, 3, 4, 5, 6, 7],
            () =>
              app.request(path, {
                headers: { authorization: `Bearer ${key}` },
              }),
            { concurrency: 1 }
          );

          // The window may turn while the test runs: then the count
          // starts again, and the test would say nothing.
          const remaining = replies.map((reply) =>
            Number(
              left.exec(reply.headers.get("ratelimit") ?? "")?.groups?.[
                "remaining"
              ]
            )
          );

          if (remaining.join(",") !== "4,3,2,1,0,0,0") {
            assert.include(remaining, 4);

            return;
          }

          assert.deepStrictEqual(
            replies.map(({ status }) => status),
            [200, 200, 200, 200, 200, 429, 429]
          );

          for (const reply of replies) {
            assert.strictEqual(
              reply.headers.get("ratelimit-policy"),
              '"default";q=5;w=60'
            );
          }

          const allowed = replies.at(0);
          const refused = replies.at(5);

          assert.isNull(allowed?.headers.get("retry-after"));

          const body = Schema.decodeUnknownSync(RefusalSchema)(refused?.body);
          const wait = Number(refused?.headers.get("retry-after"));

          assert.isAtLeast(wait, 1);
          assert.isAtMost(wait, 60);
          assert.strictEqual(body.retryAfterSeconds, wait);

          // Another key of the workspace has its own count, and a person
          // in the web app is not counted.
          const other = yield* apiKeyOf(owner, workspaceId, ["channel:read"]);

          const fresh = yield* app.request(path, {
            headers: { authorization: `Bearer ${other.key}` },
          });

          assert.strictEqual(fresh.status, 200);

          const inPerson = yield* Effect.forEach(
            [1, 2, 3, 4, 5, 6, 7],
            () => app.request(path, { headers: { cookie: owner.cookies } }),
            { concurrency: 1 }
          );

          assert.deepStrictEqual(
            inPerson.map(({ status }) => status),
            [200, 200, 200, 200, 200, 200, 200]
          );
          assert.isNull(inPerson[0]?.headers.get("ratelimit"));
        })
    );

    it.effect(
      "counts the inbox, the numbers and their exports with the rest, and answers a refused export as an error, not a file",
      () =>
        Effect.gen(function* limitedDepth() {
          const app = yield* TestApp;
          const owner = yield* signedUpUnconfirmed("limit-depth");
          const workspaceId = yield* workspaceOf(owner, "Depth limits");
          const base = `/api/workspaces/${workspaceId}`;
          const days = "days=7&timeZone=Europe%2FParis";
          const unknown = "0190f3a0-0000-7000-8000-00000000c0de";

          const { key } = yield* apiKeyOf(owner, workspaceId, [
            "analytics:read",
            "engagement:read",
            "engagement:reply",
          ]);

          const headers = { authorization: `Bearer ${key}` };
          const exported = `${base}/analytics/export?kind=posts&${days}`;

          const replies = yield* Effect.forEach(
            [
              { path: `${base}/inbox/threads` },
              { path: `${base}/analytics/dashboard?${days}` },
              { path: exported },
              {
                body: { text: "Thank you." },
                path: `${base}/inbox/comments/${unknown}/replies`,
              },
              { path: `${base}/analytics/export?kind=accounts&${days}` },
              // Past the five of this minute.
              { path: exported },
              { path: `${base}/inbox/threads` },
            ],
            (request) => app.request(request.path, { ...request, headers }),
            { concurrency: 1 }
          );

          const remaining = replies.map((reply) =>
            Number(
              left.exec(reply.headers.get("ratelimit") ?? "")?.groups?.[
                "remaining"
              ]
            )
          );

          // The window may turn while the test runs (see above).
          if (remaining.join(",") !== "4,3,2,1,0,0,0") {
            assert.include(remaining, 4);

            return;
          }

          assert.deepStrictEqual(
            replies.map(({ status }) => status),
            [200, 200, 200, 404, 200, 429, 429]
          );

          // A file while there is room, with what is left in its headers.
          assert.include(replies[2]?.headers.get("content-type"), "text/csv");
          assert.strictEqual(
            replies[2]?.headers.get("ratelimit-policy"),
            '"default";q=5;w=60'
          );

          // Past the limit, the export is the API's error like any other:
          // nothing was read, and nothing streamed.
          const refused = replies.at(5);

          assert.include(
            refused?.headers.get("content-type"),
            "application/json"
          );
          assert.isAtLeast(Number(refused?.headers.get("retry-after")), 1);
          Schema.decodeUnknownSync(RefusalSchema)(refused?.body);
          Schema.decodeUnknownSync(RefusalSchema)(replies[6]?.body);
        })
    );
  }
);
