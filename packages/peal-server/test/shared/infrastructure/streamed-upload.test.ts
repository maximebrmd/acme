import { createServer } from "node:http";
import type { Server } from "node:http";

import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Schema, Stream } from "effect";
import { FetchHttpClient, HttpClientRequest } from "effect/http";

import { multipartBody } from "#shared/infrastructure/platforms/multipart-stream.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import {
  publicHttpClientWith,
  streamedBody,
} from "#shared/infrastructure/platforms/public-http.ts";

const mebibyte = 1024 * 1024;

const decodeAddress = Schema.decodeUnknownSync(
  Schema.Struct({ port: Schema.Number })
);

interface Received {
  bytes: number;
  contentLength: string | undefined;
  contentType: string | undefined;
  head: string;
  tail: string;
  transferEncoding: string | undefined;
}

// How far the sender ran ahead of the server: the bytes read from the
// file and not yet received, which are what the process holds, and the
// most of them at any moment.
const progress = { ahead: 0, read: 0, received: 0 };

const reset = Effect.sync(() => {
  progress.ahead = 0;
  progress.read = 0;
  progress.received = 0;
});

// A server that counts what it is sent and keeps none of it, but the first
// and last bytes of each body.
const countingServer = Effect.acquireRelease(
  Effect.callback<{
    readonly received: Received[];
    readonly server: Server;
    readonly url: string;
  }>((resume) => {
    const received: Received[] = [];

    const server = createServer((request, response) => {
      // A server slower than the sender: it stops reading a moment after
      // each piece, so the sender must wait for it.
      request.on("data", () => {
        request.pause();
        setTimeout(() => {
          request.resume();
        }, 1);
      });

      const seen: Received = {
        bytes: 0,
        contentLength: request.headers["content-length"],
        contentType: request.headers["content-type"],
        head: "",
        tail: "",
        transferEncoding: request.headers["transfer-encoding"],
      };

      request.on("data", (chunk: Buffer) => {
        if (seen.bytes === 0) {
          seen.head = chunk.subarray(0, 400).toString("latin1");
        }

        seen.bytes += chunk.length;
        progress.received += chunk.length;
        seen.tail = (seen.tail + chunk.subarray(-200).toString("latin1")).slice(
          -200
        );
      });
      request.on("end", () => {
        received.push(seen);
        response.end("{}");
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = decodeAddress(server.address());

      resume(
        Effect.succeed({ received, server, url: `http://127.0.0.1:${port}` })
      );
    });
  }),
  ({ server }) =>
    Effect.callback<undefined>((resume) => {
      server.close(() => {
        resume(Effect.succeed(undefined));
      });
    })
);

// A synthetic file of `size` bytes, made a mebibyte at a time as it is
// read: it never exists whole.
const syntheticFile = (size: number) =>
  Stream.range(0, size / mebibyte - 1).pipe(
    // A piece at a time, as a store sends a file.
    Stream.rechunk(1),
    Stream.map((index) => {
      progress.read += mebibyte;
      progress.ahead = Math.max(
        progress.ahead,
        progress.read - progress.received
      );

      return new Uint8Array(mebibyte).fill(index % 251);
    })
  );

const OpenGuard = Layer.succeed(
  OutboundGuard,
  OutboundGuard.of({ check: () => Effect.void })
);

// The most the sender was ahead of the server while `effect` ran.
const mostAhead = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  reset.pipe(
    Effect.andThen(effect),
    Effect.map(() => progress.ahead)
  );

const fileSize = 128 * mebibyte;

// What an upload may hold at once, in the process and in the sockets'
// buffers: a few of the file's pieces on their way, far under the file.
const bound = 32 * mebibyte;

describe("streamed uploads", () => {
  it.live(
    "sends a 128 MiB file with its length, holding a fraction of it",
    () =>
      Effect.gen(function* streams() {
        const { received, url } = yield* countingServer;
        const client = yield* publicHttpClientWith({ timeout: "2 minutes" });

        const ahead = yield* mostAhead(
          client.execute(
            HttpClientRequest.put(`${url}/upload`).pipe(
              streamedBody(syntheticFile(fileSize), {
                contentLength: fileSize,
                contentType: "video/mp4",
              })
            )
          )
        );

        assert.lengthOf(received, 1);
        assert.strictEqual(received[0]?.bytes, fileSize);
        // Not chunked: the server is told the length, as some demand.
        assert.strictEqual(received[0]?.contentLength, String(fileSize));
        assert.isUndefined(received[0]?.transferEncoding);
        assert.strictEqual(received[0]?.contentType, "video/mp4");
        assert.isBelow(ahead, bound);

        // The same file read whole first, as uploads used to: it is all
        // in memory at once.
        const whole = yield* mostAhead(
          Stream.mkUint8Array(syntheticFile(fileSize)).pipe(
            Effect.flatMap((bytes) =>
              client.execute(
                HttpClientRequest.put(`${url}/upload`).pipe(
                  HttpClientRequest.bodyUint8Array(bytes, "video/mp4")
                )
              )
            )
          )
        );

        assert.strictEqual(whole, fileSize);
      }).pipe(
        Effect.scoped,
        Effect.provide(Layer.merge(FetchHttpClient.layer, OpenGuard))
      ),
    120_000
  );

  it.live(
    "sends a 128 MiB file in a multipart form, with the form's length, holding a fraction of it",
    () =>
      Effect.gen(function* multipart() {
        const { received, url } = yield* countingServer;
        const client = yield* publicHttpClientWith({ timeout: "2 minutes" });

        const form = multipartBody({
          boundary: "synthetic-boundary",
          fields: [{ name: "description", value: "Une vidéo “de synthèse”" }],
          file: {
            byteSize: fileSize,
            bytes: syntheticFile(fileSize),
            contentType: "video/mp4",
            fileName: 'clip "one".mp4',
            name: "file",
          },
        });

        const ahead = yield* mostAhead(
          client.execute(
            HttpClientRequest.post(`${url}/api/v2/media`).pipe(
              streamedBody(form.bytes, form)
            )
          )
        );

        const [sent] = received;

        assert(sent !== undefined);
        assert.isBelow(ahead, bound);
        assert.strictEqual(sent.bytes, form.contentLength);
        assert.strictEqual(sent.contentLength, String(form.contentLength));
        assert.isAbove(form.contentLength, fileSize);
        assert.strictEqual(
          sent.contentType,
          "multipart/form-data; boundary=synthetic-boundary"
        );
        assert.strictEqual(
          sent.head.slice(0, sent.head.indexOf("\r\n\r\n", 150) + 4),
          [
            "--synthetic-boundary",
            'Content-Disposition: form-data; name="description"',
            "",
            Buffer.from("Une vidéo “de synthèse”").toString("latin1"),
            "--synthetic-boundary",
            'Content-Disposition: form-data; name="file"; filename="clip %22one%22.mp4"',
            "Content-Type: video/mp4",
            "",
            "",
          ].join("\r\n")
        );
        assert.isTrue(sent.tail.endsWith("\r\n--synthetic-boundary--\r\n"));
      }).pipe(
        Effect.scoped,
        Effect.provide(Layer.merge(FetchHttpClient.layer, OpenGuard))
      ),
    120_000
  );
});
