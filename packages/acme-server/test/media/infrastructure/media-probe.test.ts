import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

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
import { sendSigned, storageSettings } from "#test/media/support.ts";

const expiresIn = Duration.minutes(5);

// CI runners may lack FFmpeg; the parsing tests below cover its output.
const hasFfmpeg =
  spawnSync("ffmpeg", ["-version"]).status === 0 &&
  spawnSync("ffprobe", ["-version"]).status === 0;

// A one-second 320×240 test pattern, encoded with FFmpeg's own MPEG-4 encoder,
// which every build has.
const syntheticVideo = (): Uint8Array<ArrayBuffer> => {
  const folder = mkdtempSync(path.join(os.tmpdir(), "acme-probe-"));
  const file = path.join(folder, "pattern.mp4");

  try {
    execFileSync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=320x240:rate=25",
        "-t",
        "1",
        "-c:v",
        "mpeg4",
        file,
      ],
      { stdio: "ignore" }
    );

    return new Uint8Array(readFileSync(file));
  } finally {
    rmSync(folder, { force: true, recursive: true });
  }
};

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
        ConfigProvider.fromUnknown({ ACME_FFPROBE_PATH: ffprobePath })
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
      const source = yield* stored(new Uint8Array(64), "image/png");

      const error = yield* Effect.flip(
        MediaProbe.use((probe) => probe.probe(source))
      );

      assert.strictEqual(error._tag, "MediaProbeFailed");
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

        assert.strictEqual(error._tag, "MediaProbeFailed");
        assert.notInclude(error.detail, "X-Amz-Signature");
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
