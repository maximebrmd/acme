// The error report endpoint's limits, through the whole server: what it
// reads, how much, and how often from one address.
import { assert, layer } from "@effect/vitest";
import { maxClientErrorBytes } from "acme-contract";
import { Effect } from "effect";

import { reportsPerMinute } from "#app/client-errors/intake.ts";
import { origin, TestApp } from "#test/workspace/integration/harness.ts";

const report = {
  digest: null,
  kind: "uncaught",
  message: "Synthetic error",
  path: "/app",
  release: "test",
  route: "/[locale]/app",
  stack: "Error: Synthetic error\n    at page.js:1:2",
  userAgent: "Mozilla/5.0 (Synthetic)",
};

// Each test sends from addresses of its own, so their counts never meet.
let address = 0;

const nextAddress = () => {
  address += 1;

  return `198.51.100.${address}`;
};

const send = Effect.fn("send")(function* send(
  body: string | ReadableStream<Uint8Array>,
  from: string
) {
  const app = yield* TestApp;

  const init: RequestInit = {
    body,
    headers: { "content-type": "application/json", "x-forwarded-for": from },
    method: "POST",
  };

  // A stream is sent as it is read, without a length.
  if (body instanceof ReadableStream) {
    init.duplex = "half";
  }

  const response = yield* Effect.promise(
    async () =>
      await app.handler(new Request(`${origin}/api/client-errors`, init))
  );

  return response.status;
});

// A report as a client may send it, some fields changed or left out.
type Sent = {
  readonly [Field in keyof typeof report]?: string | null | undefined;
};

const json = (sent: Sent) => JSON.stringify(sent);

layer(TestApp.layer, { excludeTestServices: true })(
  "POST /api/client-errors",
  (it) => {
    it.effect("takes a report, with no credentials", () =>
      Effect.gen(function* takes() {
        assert.strictEqual(yield* send(json(report), nextAddress()), 204);
      })
    );

    it.effect.each([
      { change: { path: "/app?token=synthetic" }, name: "a path with a query" },
      {
        change: { path: "/app#access_token=x" },
        name: "a path with a fragment",
      },
      { change: { path: "app" }, name: "a path that is not one" },
      { change: { message: "x".repeat(1001) }, name: "a message too long" },
      { change: { stack: "x".repeat(8001) }, name: "a stack too long" },
      { change: { kind: "console" }, name: "an unknown kind" },
      { change: { release: undefined }, name: "no release" },
    ])("refuses $name with 400", ({ change }) =>
      Effect.gen(function* refuses() {
        assert.strictEqual(
          yield* send(json({ ...report, ...change }), nextAddress()),
          400
        );
      })
    );

    it.effect("refuses a body that is not JSON with 400", () =>
      Effect.gen(function* refuses() {
        assert.strictEqual(yield* send("{", nextAddress()), 400);
      })
    );

    it.effect("refuses a body over 16 KiB with 413, length told or not", () =>
      Effect.gen(function* refuses() {
        const large = json({
          ...report,
          message: "x".repeat(maxClientErrorBytes),
        });

        assert.strictEqual(yield* send(large, nextAddress()), 413);

        const bytes = new TextEncoder().encode(large);

        const stream = new ReadableStream<Uint8Array>({
          start: (controller) => {
            controller.enqueue(bytes.slice(0, 8192));
            controller.enqueue(bytes.slice(8192));
            controller.close();
          },
        });

        assert.strictEqual(yield* send(stream, nextAddress()), 413);
      })
    );

    it.effect("takes so many reports a minute from an address, then 429", () =>
      Effect.gen(function* limits() {
        const flooding = nextAddress();

        for (let sent = 0; sent < reportsPerMinute; sent += 1) {
          assert.strictEqual(yield* send(json(report), flooding), 204);
        }

        assert.strictEqual(yield* send(json(report), flooding), 429);
        // Oversized and malformed reports count too.
        assert.strictEqual(yield* send("{", flooding), 429);
        // Another address is not held back.
        assert.strictEqual(yield* send(json(report), nextAddress()), 204);
      })
    );
  }
);
