import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Stream } from "effect";
import { Dns } from "effect/net";

import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { publicStreamedPost } from "#shared/infrastructure/platforms/public-upload.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import {
  dropped,
  empty,
  headerOf,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";

const bytes = Uint8Array.from({ length: 70_000 }, (_, index) => index % 251);

const upload = <E = never>(
  url: string,
  body: Stream.Stream<Uint8Array, E> = Stream.make(bytes)
) => ({
  body,
  contentLength: bytes.byteLength,
  contentType: "application/octet-stream",
  timeout: "5 seconds" as const,
  url: new URL(url),
});

describe("a streamed upload", () => {
  it.live("declares its length, and answers the host's status", () =>
    Effect.gen(function* sent() {
      const server = yield* platformServer(() => empty(204));
      const post = yield* publicStreamedPost;

      // The file comes from the store in chunks of any size.
      const status = yield* post(
        upload(
          `${server.url}/upload`,
          Stream.make(bytes.subarray(0, 1000), bytes.subarray(1000))
        )
      );

      const [request] = server.requests();

      assert(request !== undefined);
      assert.strictEqual(status, 204);
      assert.strictEqual(request.method, "POST");
      assert.strictEqual(headerOf(request, "content-length"), "70000");
      assert.strictEqual(headerOf(request, "transfer-encoding"), "");
      assert.deepStrictEqual(request.body, bytes);
    }).pipe(Effect.scoped, Effect.provide(OpenOutboundGuard))
  );

  it.live("answers a redirect as it comes, and follows none", () =>
    Effect.gen(function* redirected() {
      const server = yield* platformServer((request, origin) =>
        request.path === "/upload"
          ? empty(307, { location: `${origin}/elsewhere` })
          : empty(204)
      );

      const post = yield* publicStreamedPost;
      const status = yield* post(upload(`${server.url}/upload`));

      assert.strictEqual(status, 307);
      assert.lengthOf(server.requests(), 1);
    }).pipe(Effect.scoped, Effect.provide(OpenOutboundGuard))
  );

  it.live(
    "is unanswered when the host drops it, or the file cannot be read",
    () =>
      Effect.gen(function* unanswered() {
        const server = yield* platformServer(() => dropped);
        const post = yield* publicStreamedPost;

        const lost = yield* post(upload(`${server.url}/upload`)).pipe(
          Effect.flip
        );

        const unreadable = yield* post(
          upload(
            `${server.url}/upload`,
            Stream.make(bytes.subarray(0, 10)).pipe(
              Stream.concat(Stream.fail("the store is down"))
            )
          )
        ).pipe(Effect.flip);

        assert.strictEqual(lost._tag, "UploadUnanswered");
        assert.strictEqual(unreadable._tag, "UploadUnanswered");
      }).pipe(Effect.scoped, Effect.provide(OpenOutboundGuard))
  );

  it.effect("goes to public HTTPS hosts only", () =>
    Effect.gen(function* guarded() {
      const post = yield* publicStreamedPost;

      const refusals = yield* Effect.forEach(
        ["http://uploads.example/", "https://intranet.example/upload"],
        (url) => post(upload(url)).pipe(Effect.flip)
      );

      assert.deepStrictEqual(
        refusals.map((refused) =>
          refused._tag === "OutboundRequestRefused" ? refused.reason : "sent"
        ),
        ["notHttps", "notPublic"]
      );
    }).pipe(
      Effect.provide(
        OutboundGuard.layer.pipe(
          Layer.provide(
            Dns.layerStatic({
              hosts: {
                "intranet.example": ["10.0.0.5"],
                "uploads.example": ["93.184.215.14"],
              },
            })
          )
        )
      )
    )
  );
});
