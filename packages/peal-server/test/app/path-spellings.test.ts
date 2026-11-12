// Paths the server refuses before it routes them, through the whole server:
// an encoded slash or backslash, or a dot segment, raw or encoded. The proxy
// in front of the server decodes and resolves them to match its rules, and
// the router does neither, so `/api/admin/users/x%2F..%2F..%2Fhealth` would
// be an open path to the first and the staff console to the second.
import { assert, layer } from "@effect/vitest";
import { Effect, Option, Schema } from "effect";

import {
  confirmedAccount,
  IntegrationLive,
  makeAdmin,
  origin,
  signIn,
  TestApp,
} from "#test/workspace/integration/harness.ts";

// A request whose path stays as written. `Request` resolves dot segments
// when it parses its URL, as Bun does before the server sees a request;
// a runtime that hands the server the request line as sent, as Node does,
// leaves them, which this stands for.
const rawRequest = (path: string, cookie: string) => {
  const request = new Request(origin, { headers: { cookie, origin } });

  Object.defineProperty(request, "url", { value: `${origin}${path}` });

  return request;
};

const CodedSchema = Schema.fromJsonString(
  Schema.Struct({ code: Schema.String })
);

const decodeCode = Schema.decodeUnknownOption(CodedSchema);

const answerTo = Effect.fn("answerTo")(function* answerTo(
  path: string,
  cookie: string
) {
  const app = yield* TestApp;

  const response = yield* Effect.promise(
    async () => await app.handler(rawRequest(path, cookie))
  );

  const text = yield* Effect.promise(async () => await response.text());

  return {
    code: decodeCode(text).pipe(
      Option.map((body) => body.code),
      Option.getOrUndefined
    ),
    status: response.status,
  };
});

const refused = [
  // The traversal cloudflared resolves to an open path.
  "/api/admin/users/x%2F..%2F..%2F..%2F..%2Fapi%2Fhealth",
  "/api/admin/users/x%2f..%2f..%2fhealth",
  "/api/admin/users/x%5C..%5C..%5Chealth",
  "/api/admin/users/x%5c..",
  "/api/admin/users/x\\..\\..\\health",
  "/api/auth/admin/list-users%2F..%2F..%2Fok",
  "/api/mcp%2F..",
  "/en/admin/users/x%2F..%2Fy",
  // Dot segments, raw or encoded, wherever they are.
  "/api/admin/../health",
  "/api/admin/users/./x",
  "/api/admin/%2e%2e/health",
  "/api/admin/%2E%2e/health",
  "/api/admin/.%2E/health",
  "/api/admin/%2e/users",
  "/api/admin/..",
  "/api/health/.",
  "/api/health/..?x=1",
];

layer(IntegrationLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "paths written to slip past the proxy",
  (it) => {
    it.effect(
      "answers 400 before routing, to staff too, in the API's envelope",
      () =>
        Effect.gen(function* refusing() {
          const staff = yield* confirmedAccount("spellings-staff");

          yield* makeAdmin(staff.id);

          const cookie = yield* signIn(staff.email);

          for (const path of refused) {
            const { code, status } = yield* answerTo(path, cookie);

            assert.strictEqual(status, 400, path);
            assert.strictEqual(code, "bad_request", path);
          }

          // What looks like them but is not: dots inside a segment, an
          // encoded slash in the query, an encoded character that is not a
          // separator.
          const user = yield* answerTo(`/api/admin/users/${staff.id}`, cookie);

          assert.strictEqual(user.status, 200);

          const kept = [
            ["/api/health", 204],
            ["/api/health?next=%2F..%2Fadmin&b=a%5Cb", 204],
            ["/api/admin/users/x..y", 404],
            ["/api/admin/users/...", 404],
            ["/api/admin/users/x%20y", 404],
          ] as const;

          for (const [path, expected] of kept) {
            const { status } = yield* answerTo(path, cookie);

            assert.strictEqual(status, expected, path);
          }
        })
    );
  }
);
