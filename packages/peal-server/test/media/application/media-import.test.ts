import { once } from "node:events";
import { createServer } from "node:http";
import type { ServerResponse } from "node:http";

import { assert, layer } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, Option, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { TestClock } from "effect/testing";
import sharp from "sharp";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import {
  CurrentUploadPolicy,
  defaultUploadPolicy,
} from "#media/application/upload-policy.ts";
import { MediaLibrary, mediaWith } from "#media/container.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { HttpRemoteMedia } from "#media/infrastructure/http-remote-media.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { everyWorkspaceOn, UnmeteredTest } from "#test/billing/support.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import { syntheticPdf } from "#test/media/pdf.ts";
import {
  damagedPng,
  DatabaseTest,
  fetchBytes,
  mebibytes,
  MediaInPostsTest,
  MediaTestLive,
  memberIn,
  NoWebhooks,
  storageSettings,
  syntheticBytes,
  TransactionsTest,
} from "#test/media/support.ts";
import { eventsSentTo } from "#test/webhooks/fakes/event-log.ts";
import {
  freshEndpoint,
  freshOwner,
  WebhooksTest,
} from "#test/webhooks/support.ts";

// Importing a file from an address: fetched by the server, stored in parts
// and probed like an upload. A loopback server stands for the member's
// host, which only an open guard lets the server reach.

type Answer = (response: ServerResponse) => void;

const decodeAddress = Schema.decodeUnknownSync(
  Schema.Struct({ port: Schema.Number })
);

// A host serving `files` by path, closed with the scope.
const hostServing = (files: Readonly<Record<string, Answer>>) =>
  Effect.acquireRelease(
    Effect.promise(async () => {
      const server = createServer((request, response) => {
        const answer = files[request.url ?? ""];

        if (answer === undefined) {
          response.writeHead(404).end();
        } else {
          answer(response);
        }
      });

      server.listen(0, "127.0.0.1");
      await once(server, "listening");

      return {
        server,
        url: `http://127.0.0.1:${decodeAddress(server.address()).port}`,
      };
    }),
    ({ server }) =>
      Effect.promise(async () => {
        server.closeAllConnections();
        server.close();
        await once(server, "close");
      })
  );

const whole =
  (body: Uint8Array, contentType = "application/octet-stream"): Answer =>
  (response) => {
    response
      .writeHead(200, {
        "content-length": body.byteLength,
        "content-type": contentType,
      })
      .end(body);
  };

// Without a declared size, in pieces, as a host that streams does.
const chunked =
  (body: Uint8Array, pieceSize: number): Answer =>
  (response) => {
    response.writeHead(200, { "content-type": "video/mp4" });

    for (let from = 0; from < body.byteLength; from += pieceSize) {
      response.write(body.subarray(from, from + pieceSize));
    }

    response.end();
  };

const redirectTo =
  (location: string): Answer =>
  (response) => {
    response.writeHead(302, { location }).end();
  };

const whitePng = Effect.promise(
  async () =>
    new Uint8Array(
      await sharp({
        create: { background: "#ffffff", channels: 3, height: 40, width: 60 },
      })
        .png()
        .toBuffer()
    )
);

// Bytes that start like an MP4 and go on as a pattern.
const mp4Like = (size: number) =>
  Uint8Array.from(
    syntheticBytes(size),
    (byte, index) =>
      [0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d][index] ??
      byte
  );

const importing = (entitlements: typeof UnmeteredTest) =>
  Layer.mergeAll(
    mediaWith(
      HttpRemoteMedia.pipe(
        Layer.provide(OpenOutboundGuard),
        Layer.provide(FetchHttpClient.layer)
      )
    ).pipe(
      Layer.provide(
        Layer.mergeAll(
          MediaInPostsTest,
          entitlements,
          NoWebhooks,
          TransactionsTest
        )
      )
    ),
    S3MediaStorageLive,
    DrizzleMediaAssetsLive
  ).pipe(Layer.provideMerge(DatabaseTest), Layer.provide(storageSettings));

const freshWorkspace = Ids.use((ids) => ids.next).pipe(
  Effect.map((uuid) => WorkspaceIdSchema.make(uuid))
);

const importFrom = (workspaceId: typeof WorkspaceIdSchema.Type, url: string) =>
  MediaLibrary.use((library) =>
    library.importMedia(memberIn(workspaceId), {
      altText: Option.some("A synthetic picture."),
      url,
    })
  );

const assetsOf = (workspaceId: typeof WorkspaceIdSchema.Type) =>
  MediaAssets.use((assets) =>
    assets.list(workspaceId, { after: Option.none(), limit: 10 })
  ).pipe(Effect.map(({ assets }) => assets));

// Parts of the stores' 5 MiB minimum, so a file of 11 MiB goes in three.
const smallParts = { ...defaultUploadPolicy, partSize: mebibytes(5) };

layer(importing(UnmeteredTest), { timeout: "120 seconds" })(
  "importing media from an address",
  (it) => {
    it.effect("stores and probes an image, whatever its host calls it", () =>
      Effect.gen(function* importsImage() {
        const workspaceId = yield* freshWorkspace;
        const png = yield* whitePng;

        const host = yield* hostServing({
          "/moved": redirectTo("/picture"),
          "/picture": whole(png, "text/plain"),
        });

        const imported = yield* importFrom(workspaceId, `${host.url}/moved`);

        assert.strictEqual(imported.asset.status._tag, "ready");
        assert.strictEqual(imported.asset.contentType, "image/png");
        assert.strictEqual(imported.asset.byteSize, png.byteLength);
        assert.deepStrictEqual(
          imported.asset.metadata.dimensions,
          Option.some({ height: 40, width: 60 })
        );
        assert.deepStrictEqual(
          imported.asset.altText,
          Option.some("A synthetic picture.")
        );

        const { bytes } = yield* fetchBytes(
          Option.getOrElse(imported.url, () => "")
        );

        assert.deepStrictEqual(bytes, png);

        yield* MediaStorage.use((storage) =>
          storage.remove(imported.asset.storageKey)
        );
      })
    );

    it.effect("stores and probes a PDF document, as an upload of one is", () =>
      Effect.gen(function* importsDocument() {
        const workspaceId = yield* freshWorkspace;
        const pdf = syntheticPdf(3);

        const host = yield* hostServing({
          "/deck": whole(pdf, "application/octet-stream"),
        });

        const imported = yield* importFrom(workspaceId, `${host.url}/deck`);

        assert.strictEqual(imported.asset.status._tag, "ready");
        assert.strictEqual(imported.asset.contentType, "application/pdf");
        assert.strictEqual(imported.asset.kind, "document");
        assert.deepStrictEqual(imported.asset.metadata.pages, Option.some(3));

        yield* MediaStorage.use((storage) =>
          storage.remove(imported.asset.storageKey)
        );
      })
    );

    it.effect(
      "runs two imports a workspace at once, and refuses a third until one ends",
      () =>
        Effect.gen(function* busy() {
          const workspaceId = yield* freshWorkspace;
          const elsewhere = yield* freshWorkspace;
          const png = yield* whitePng;
          const waiting: ServerResponse[] = [];
          const both = yield* Deferred.make<true>();

          // A host that takes its time: it answers when the test says.
          const host = yield* hostServing({
            "/picture": whole(png, "image/png"),
            "/slow": (response) => {
              waiting.push(response);

              if (waiting.length === 2) {
                Effect.runFork(Deferred.succeed(both, true));
              }
            },
          });

          // In this fiber, so the imports outlive the loop that starts them.
          const slow = yield* Effect.forEach([1, 2], () =>
            importFrom(workspaceId, `${host.url}/slow`).pipe(
              Effect.result,
              Effect.forkChild
            )
          );

          yield* Deferred.await(both);

          const third = yield* importFrom(
            workspaceId,
            `${host.url}/picture`
          ).pipe(Effect.flip);

          assert.strictEqual(third._tag, "MediaImportBusy");

          // Another workspace is not held back by this one.
          const theirs = yield* importFrom(elsewhere, `${host.url}/picture`);

          for (const response of waiting) {
            response.writeHead(404).end();
          }

          yield* Effect.forEach(slow, Fiber.join, { discard: true });

          // Its imports over, the workspace imports again.
          const after = yield* importFrom(workspaceId, `${host.url}/picture`);

          yield* MediaStorage.use((storage) =>
            Effect.forEach(
              [theirs, after],
              ({ asset }) => storage.remove(asset.storageKey),
              { discard: true }
            )
          );
        })
    );

    it.effect("stores a file of unknown size in parts, as it arrives", () =>
      Effect.gen(function* importsInParts() {
        const workspaceId = yield* freshWorkspace;
        const video = mp4Like(mebibytes(11));

        const host = yield* hostServing({
          "/clip": chunked(video, 256 * 1024),
        });

        // It is no video: the probe cannot read it, and says so; the file
        // is stored whole all the same.
        const imported = yield* importFrom(
          workspaceId,
          `${host.url}/clip`
        ).pipe(Effect.provideService(CurrentUploadPolicy, smallParts));

        assert.strictEqual(imported.asset.contentType, "video/mp4");
        assert.strictEqual(imported.asset.byteSize, video.byteLength);
        assert.strictEqual(imported.asset.status._tag, "uploaded");

        const { bytes } = yield* fetchBytes(
          Option.getOrElse(imported.url, () => "")
        );

        assert.strictEqual(bytes.byteLength, video.byteLength);
        assert.deepStrictEqual(bytes.subarray(-64), video.subarray(-64));

        yield* MediaStorage.use((storage) =>
          storage.remove(imported.asset.storageKey)
        );
      })
    );

    it.effect("refuses what it does not store, and keeps nothing of it", () =>
      Effect.gen(function* refuses() {
        const workspaceId = yield* freshWorkspace;

        const host = yield* hostServing({
          "/around": redirectTo("/around"),
          "/damaged": whole(damagedPng(4096), "image/png"),
          "/huge": whole(damagedPng(mebibytes(16) + 1), "image/png"),
          "/page": whole(
            new TextEncoder().encode("<!doctype html><html></html>"),
            "image/png"
          ),
          "/silent": () => {
            // Never answers.
          },
          "/slow": (response) => {
            // Starts a picture, and never finishes it.
            response.writeHead(200, { "content-type": "image/png" });
            response.write(damagedPng(64));
          },
        });

        const refusal = (path: string) =>
          importFrom(workspaceId, `${host.url}${path}`).pipe(Effect.flip);

        const page = yield* refusal("/page");

        assert.strictEqual(page._tag, "UnsupportedMediaType");

        const huge = yield* refusal("/huge");

        assert.strictEqual(huge._tag, "MediaTooLarge");

        const missing = yield* refusal("/nowhere");

        assert.strictEqual(missing._tag, "MediaSourceUnreachable");

        if (missing._tag === "MediaSourceUnreachable") {
          assert.strictEqual(missing.reason, "badStatus");
          assert.deepStrictEqual(missing.status, Option.some(404));
        }

        const around = yield* refusal("/around");

        assert.strictEqual(around._tag, "MediaSourceUnreachable");

        if (around._tag === "MediaSourceUnreachable") {
          assert.strictEqual(around.reason, "tooManyRedirects");
        }

        // The host never answers: once the import's time is up on the
        // test's clock, it gives up.
        const waiting = yield* Effect.forkChild(refusal("/slow"));

        // Time for the request to leave, on the real clock.
        yield* TestClock.withLive(Effect.sleep("1 second"));
        yield* TestClock.adjust(defaultUploadPolicy.importTimeout);

        const slow = yield* Fiber.join(waiting);

        // One that never answers at all is not waited for that long.
        const unanswered = yield* Effect.forkChild(refusal("/silent"));

        yield* TestClock.withLive(Effect.sleep("1 second"));
        yield* TestClock.adjust("20 seconds");

        const silent = yield* Fiber.join(unanswered);

        assert.strictEqual(silent._tag, "MediaSourceUnreachable");

        if (silent._tag === "MediaSourceUnreachable") {
          assert.strictEqual(silent.reason, "noAnswer");
        }

        assert.strictEqual(slow._tag, "MediaSourceUnreachable");

        if (slow._tag === "MediaSourceUnreachable") {
          assert.strictEqual(slow.reason, "tooSlow");
        }

        const secret = yield* importFrom(
          workspaceId,
          "https://user:secret@files.example/picture.png"
        ).pipe(Effect.flip);

        assert.strictEqual(secret._tag, "MediaSourceNotPublic");

        // Nothing was recorded so far.
        assert.lengthOf(yield* assetsOf(workspaceId), 0);

        // A file that only starts like a PNG is stored, as an upload the
        // probe cannot read is: uploaded, with why, and not ready to post.
        const damaged = yield* importFrom(workspaceId, `${host.url}/damaged`);

        assert.strictEqual(damaged.asset.status._tag, "uploaded");
        assert.lengthOf(yield* assetsOf(workspaceId), 1);

        yield* MediaStorage.use((storage) =>
          storage.remove(damaged.asset.storageKey)
        );

        // A viewer imports nothing.
        const denied = yield* MediaLibrary.use((library) =>
          library.importMedia(memberIn(workspaceId, ["media:read"]), {
            altText: Option.none(),
            url: `${host.url}/damaged`,
          })
        ).pipe(Effect.flip);

        assert.strictEqual(denied._tag, "MissingPermission");
      })
    );
  }
);

// The same, with the workspace's webhooks listening, on the webhooks' own
// stores: an import ends as an upload does, and says so.
const importingHeard = Layer.mergeAll(
  mediaWith(
    HttpRemoteMedia.pipe(
      Layer.provide(OpenOutboundGuard),
      Layer.provide(FetchHttpClient.layer)
    )
  ).pipe(Layer.provide(Layer.mergeAll(MediaInPostsTest, UnmeteredTest))),
  S3MediaStorageLive
).pipe(Layer.provideMerge(WebhooksTest), Layer.provide(storageSettings));

layer(importingHeard, { timeout: "120 seconds" })(
  "importing media, to webhook endpoints",
  (it) => {
    it.effect(
      "says once that an imported file is ready, and that a damaged one failed",
      () =>
        Effect.gen(function* heard() {
          const owner = yield* freshOwner;
          const png = yield* whitePng;

          const { endpoint } = yield* freshEndpoint(owner, {
            eventTypes: ["media.ready", "media.failed"],
          });

          const host = yield* hostServing({
            "/damaged": whole(damagedPng(4096), "image/png"),
            "/picture": whole(png, "image/png"),
          });

          const library = yield* MediaLibrary;

          const imported = yield* library.importMedia(owner, {
            altText: Option.none(),
            url: `${host.url}/picture`,
          });

          // Stored, and not a picture a decoder reads: kept as uploaded.
          const damaged = yield* library.importMedia(owner, {
            altText: Option.none(),
            url: `${host.url}/damaged`,
          });

          assert.strictEqual(damaged.asset.status._tag, "uploaded");

          const sent = yield* eventsSentTo(owner, endpoint.id);

          assert.deepStrictEqual(sent[0], {
            data: {
              contentType: "image/png",
              mediaId: imported.asset.id,
              workspaceId: owner.workspaceId,
            },
            type: "media.ready",
          });
          assert.deepStrictEqual(
            sent
              .slice(1)
              .map(({ data, type }) => [
                type,
                "mediaId" in data ? data.mediaId : null,
              ]),
            [["media.failed", damaged.asset.id]]
          );

          yield* MediaStorage.use((storage) =>
            storage.remove(damaged.asset.storageKey)
          );
          yield* MediaStorage.use((storage) =>
            storage.remove(imported.asset.storageKey)
          );
        })
    );
  }
);

layer(importing(everyWorkspaceOn("free")), { timeout: "120 seconds" })(
  "importing media on a plan",
  (it) => {
    it.effect("takes a file the plan's media storage has room for", () =>
      Effect.gen(function* limited() {
        const workspaceId = yield* freshWorkspace;

        // Well within the free plan's storage: counted, and let through.
        const host = yield* hostServing({
          "/picture": whole(yield* whitePng, "image/png"),
        });

        const imported = yield* importFrom(workspaceId, `${host.url}/picture`);

        assert.strictEqual(imported.asset.status._tag, "ready");

        yield* MediaStorage.use((storage) =>
          storage.remove(imported.asset.storageKey)
        );
      })
    );
  }
);

layer(
  Layer.mergeAll(MediaTestLive, DrizzleMediaAssetsLive).pipe(
    Layer.provideMerge(DatabaseTest),
    Layer.provide(storageSettings)
  ),
  { timeout: "60 seconds" }
)("importing media through the outbound guard", (it) => {
  it.effect("fetches nothing from an address that is not public", () =>
    Effect.gen(function* guarded() {
      const workspaceId = yield* freshWorkspace;

      const refusals = yield* Effect.forEach(
        [
          "http://files.example/picture.png",
          "https://127.0.0.1/picture.png",
          "https://[::1]/picture.png",
          "https://10.0.0.8/picture.png",
          "https://169.254.169.254/latest/meta-data",
          "https://files.example:8443/picture.png",
          "not an address",
        ],
        (url) => importFrom(workspaceId, url).pipe(Effect.flip)
      );

      assert.deepStrictEqual(
        refusals.map(({ _tag }) => _tag),
        refusals.map(() => "MediaSourceNotPublic")
      );

      // A name that does not resolve is the member's typo.
      const unknown = yield* importFrom(
        workspaceId,
        "https://files.example/picture.png"
      ).pipe(Effect.flip);

      assert.strictEqual(unknown._tag, "MediaSourceUnreachable");
    })
  );
});
