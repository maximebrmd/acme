import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Duration, Effect, Layer, Option } from "effect";
import sharp from "sharp";

import { MediaProbe } from "#media/application/ports/media-probe.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import type { MediaContentType } from "#media/domain/media-format.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";
import { storageKeyFor } from "#media/domain/storage-key.ts";
import { MediaProbeLive } from "#media/infrastructure/media-probe.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import {
  damagedPng,
  hasFfmpeg,
  sendSigned,
  storageSettings,
  syntheticSvg,
  syntheticVideo,
} from "#test/media/support.ts";

const expiresIn = Duration.minutes(5);

// A 40×30 JPEG whose EXIF orientation turns it a quarter turn.
const sidewaysJpeg = Effect.promise(
  async () =>
    new Uint8Array(
      await sharp({
        create: { background: "#336699", channels: 3, height: 30, width: 40 },
      })
        .jpeg()
        .withMetadata({ orientation: 6 })
        .toBuffer()
    )
);

// A 4×3 TIFF, a format sharp reads and peal does not take.
const tiff = Effect.promise(
  async () =>
    new Uint8Array(
      await sharp({
        create: { background: "#336699", channels: 3, height: 3, width: 4 },
      })
        .tiff()
        .toBuffer()
    )
);

// Stores `body` under a fresh key and returns a URL the probe can read.
const stored = Effect.fn("stored")(function* stored(
  body: Uint8Array<ArrayBuffer>,
  contentType: MediaContentType
) {
  const ids = yield* Ids;
  const storage = yield* MediaStorage;

  const key = storageKeyFor(
    WorkspaceIdSchema.make(yield* ids.next),
    MediaAssetIdSchema.make(yield* ids.next),
    contentType
  );

  yield* sendSigned(
    yield* storage.signUpload({
      byteSize: body.length,
      contentType,
      expiresIn,
      key,
    }),
    body
  );

  yield* Effect.addFinalizer(() => Effect.orDie(storage.remove(key)));

  return { contentType, url: yield* storage.publicUrl(key, expiresIn) };
});

const probeWith = (ffprobePath: string) =>
  Layer.mergeAll(MediaProbeLive, S3MediaStorageLive, IdsLive).pipe(
    Layer.provide(
      ConfigProvider.layerAdd(
        ConfigProvider.fromUnknown({ PEAL_FFPROBE_PATH: ffprobePath })
      )
    ),
    Layer.provide(storageSettings)
  );

layer(probeWith("ffprobe"))("the media probe", (it) => {
  it.effect("reads an image's displayed dimensions", () =>
    Effect.gen(function* image() {
      const source = yield* stored(yield* sidewaysJpeg, "image/jpeg");
      const outcome = yield* MediaProbe.use((probe) => probe.probe(source));

      assert.deepStrictEqual(outcome, {
        _tag: "probed",
        metadata: new MediaMetadata({
          codec: Option.none(),
          dimensions: Option.some({ height: 40, width: 30 }),
          duration: Option.none(),
        }),
      });
    })
  );

  it.effect("refuses an image it cannot read", () =>
    Effect.gen(function* unreadable() {
      const source = yield* stored(damagedPng(64), "image/png");

      const error = yield* Effect.flip(
        MediaProbe.use((probe) => probe.probe(source))
      );

      assert.include(error, { _tag: "MediaProbeFailed", reason: "unreadable" });
    })
  );

  it.effect.each([
    { body: syntheticSvg, format: "an SVG" },
    { body: () => new Uint8Array(64), format: "unknown bytes" },
  ])("refuses $format declared as a PNG", ({ body }) =>
    Effect.gen(function* notDeclared() {
      const source = yield* stored(body(), "image/png");

      const error = yield* Effect.flip(
        MediaProbe.use((probe) => probe.probe(source))
      );

      assert.include(error, {
        _tag: "MediaTypeMismatch",
        declared: "image/png",
      });
    })
  );

  it.effect("refuses an image in another format sharp reads", () =>
    Effect.gen(function* otherFormat() {
      const source = yield* stored(yield* tiff, "image/jpeg");

      const error = yield* Effect.flip(
        MediaProbe.use((probe) => probe.probe(source))
      );

      assert.include(error, {
        _tag: "MediaTypeMismatch",
        declared: "image/jpeg",
      });
    })
  );

  it.effect("reports a store that cannot serve an image", () =>
    Effect.gen(function* unreachableImage() {
      // Nothing listens on port 1.
      const error = yield* Effect.flip(
        MediaProbe.use((probe) =>
          probe.probe({
            contentType: "image/png",
            url: "http://127.0.0.1:1/unreachable.png",
          })
        )
      );

      assert.strictEqual(error._tag, "MediaStorageFailed");
    })
  );

  it.effect.skipIf(!hasFfmpeg)(
    "reads a video's dimensions, duration and codec with ffprobe",
    () =>
      Effect.gen(function* video() {
        const source = yield* stored(syntheticVideo(), "video/mp4");
        const outcome = yield* MediaProbe.use((probe) => probe.probe(source));

        assert.strictEqual(outcome._tag, "probed");

        const metadata =
          outcome._tag === "probed" ? outcome.metadata : MediaMetadata.unknown;

        assert.deepStrictEqual(metadata.codec, Option.some("mpeg4"));
        assert.deepStrictEqual(
          metadata.dimensions,
          Option.some({ height: 240, width: 320 })
        );
        assert.deepStrictEqual(
          metadata.duration,
          Option.some(Duration.seconds(1))
        );
      })
  );

  it.effect.skipIf(!hasFfmpeg)(
    "refuses a video it cannot read, without the presigned URL",
    () =>
      Effect.gen(function* garbage() {
        const source = yield* stored(new Uint8Array(4096), "video/mp4");

        const error = yield* Effect.flip(
          MediaProbe.use((probe) => probe.probe(source))
        );

        assert.include(error, {
          _tag: "MediaProbeFailed",
          reason: "unreadable",
        });
      })
  );

  it.effect.skipIf(!hasFfmpeg)(
    "reports a store that cannot serve a video",
    () =>
      Effect.gen(function* unreachableVideo() {
        const error = yield* Effect.flip(
          MediaProbe.use((probe) =>
            probe.probe({
              contentType: "video/mp4",
              url: "http://127.0.0.1:1/unreachable.mp4",
            })
          )
        );

        assert.strictEqual(error._tag, "MediaStorageFailed");
      })
  );
});

layer(probeWith("/nonexistent/ffprobe"))(
  "the media probe without ffprobe",
  (it) => {
    it.effect("skips videos, and says so", () =>
      Effect.gen(function* skipped() {
        const source = yield* stored(new Uint8Array(4096), "video/quicktime");
        const outcome = yield* MediaProbe.use((probe) => probe.probe(source));

        assert.deepStrictEqual(outcome, {
          _tag: "skipped",
          reason: "probeUnavailable",
        });
      })
    );
  }
);
