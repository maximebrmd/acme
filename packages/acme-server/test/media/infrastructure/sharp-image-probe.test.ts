import { createServer } from "node:http";
import type { OutgoingHttpHeaders } from "node:http";

import { assert, describe, expect, it } from "@effect/vitest";
import { Duration, Effect, Fiber, Latch, Option, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { TestClock } from "effect/testing";
import sharp from "sharp";
import type { Sharp } from "sharp";

import {
  loadSharp,
  makeSharpImageProbe,
  sniffImageType,
} from "#media/infrastructure/sharp-image-probe.ts";
import { damagedPng, syntheticSvg } from "#test/media/support.ts";

const decodeAddress = Schema.decodeUnknownSync(
  Schema.Struct({ port: Schema.Int })
);

// A store that answers every request with `headers`, then never sends the
// body. `requested` opens once a request arrives.
const stallingStore = (headers: OutgoingHttpHeaders) =>
  Effect.gen(function* startStallingStore() {
    const requested = yield* Latch.make();

    const server = yield* Effect.acquireRelease(
      Effect.callback<ReturnType<typeof createServer>>((resume) => {
        const opened = createServer((_request, response) => {
          response.writeHead(200, headers);
          response.flushHeaders();
          requested.openUnsafe();
        });

        opened.listen(0, "127.0.0.1", () => {
          resume(Effect.succeed(opened));
        });
      }),
      (opened) =>
        Effect.sync(() => {
          opened.closeAllConnections();
          opened.close();
        })
    );

    const { port } = decodeAddress(server.address());

    return { requested, url: `http://127.0.0.1:${port}/stalled.png` };
  });

// A 2×2 white image, encoded by `encode`.
const encoded = (encode: (image: Sharp) => Sharp) =>
  Effect.promise(
    async () =>
      new Uint8Array(
        await encode(
          sharp({
            create: { background: "#ffffff", channels: 3, height: 2, width: 2 },
          })
        ).toBuffer()
      )
  );

describe(sniffImageType, () => {
  it.effect("reads the type a file's first bytes announce", () =>
    Effect.gen(function* sniffs() {
      const images = {
        "image/gif": yield* encoded((image) => image.gif()),
        "image/jpeg": yield* encoded((image) => image.jpeg()),
        "image/png": yield* encoded((image) => image.png()),
        "image/webp": yield* encoded((image) => image.webp()),
      };

      for (const [contentType, bytes] of Object.entries(images)) {
        assert.deepStrictEqual(sniffImageType(bytes), Option.some(contentType));
      }
    })
  );

  it("knows a damaged PNG by its signature", () => {
    expect(sniffImageType(damagedPng(64))).toStrictEqual(
      Option.some("image/png")
    );
  });

  it.each([
    { bytes: syntheticSvg(), format: "an SVG" },
    { bytes: Uint8Array.of(0x49, 0x49, 0x2a, 0, 0, 0, 0, 0), format: "a TIFF" },
    { bytes: new Uint8Array(0), format: "an empty file" },
  ])("takes $format for no type acme stores", ({ bytes }) => {
    expect(sniffImageType(bytes)).toStrictEqual(Option.none());
  });
});

describe(makeSharpImageProbe, () => {
  it.effect("loads sharp where its prebuilt binary runs", () =>
    Effect.gen(function* loads() {
      assert.isTrue(Option.isSome(yield* loadSharp));
    })
  );

  it.effect(
    "skips images, without fetching them, when sharp did not load",
    () =>
      Effect.gen(function* skips() {
        const probe = yield* makeSharpImageProbe(Option.none());

        // Nothing listens on port 1: a fetch would fail the probe.
        const outcome = yield* probe({
          contentType: "image/png",
          url: "http://127.0.0.1:1/never-fetched.png",
        });

        assert.deepStrictEqual(outcome, {
          _tag: "skipped",
          reason: "probeUnavailable",
        });
      }).pipe(Effect.provide(FetchHttpClient.layer))
  );

  it.effect("gives up on a store that stops sending the file", () =>
    Effect.gen(function* stalls() {
      const store = yield* stallingStore({
        "content-length": "1000",
        "content-type": "image/png",
      });

      const probe = yield* makeSharpImageProbe(yield* loadSharp);

      const probing = yield* probe({
        contentType: "image/png",
        url: store.url,
      }).pipe(Effect.flip, Effect.forkChild);

      yield* store.requested.await;
      yield* TestClock.adjust(Duration.minutes(1));

      assert.include(yield* Fiber.join(probing), {
        _tag: "MediaProbeFailed",
        reason: "timedOut",
      });
    }).pipe(Effect.provide(FetchHttpClient.layer))
  );

  it.effect("refuses a file larger than an image, before reading it", () =>
    Effect.gen(function* oversized() {
      const store = yield* stallingStore({
        "content-length": String(16 * 1024 * 1024 + 1),
        "content-type": "image/png",
      });

      const probe = yield* makeSharpImageProbe(yield* loadSharp);

      const error = yield* Effect.flip(
        probe({ contentType: "image/png", url: store.url })
      );

      assert.include(error, { _tag: "MediaProbeFailed", reason: "tooLarge" });
    }).pipe(Effect.provide(FetchHttpClient.layer))
  );
});
