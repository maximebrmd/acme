import * as BunChildProcessSpawner from "@effect/platform-bun/BunChildProcessSpawner";
import * as BunFileSystem from "@effect/platform-bun/BunFileSystem";
import * as BunPath from "@effect/platform-bun/BunPath";
import { Config, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { MediaProbe } from "#media/application/ports/media-probe.ts";
import type { MediaSource } from "#media/application/ports/media-probe.ts";
import { kindOf } from "#media/domain/media-format.ts";

import { makeFfprobeVideoProbe } from "./ffprobe-video-probe.ts";
import { makePdfDocumentProbe } from "./pdf-document-probe.ts";
import { loadSharp, makeSharpImageProbe } from "./sharp-image-probe.ts";

/**
 * Images through sharp, videos through ffprobe, PDFs by reading their own
 * bytes. PEAL_FFPROBE_PATH names the
 * ffprobe program, "ffprobe" on the PATH by default. A kind whose tool is
 * missing is skipped, so the server runs without either.
 */
export const MediaProbeLive = Layer.effect(
  MediaProbe,
  Effect.gen(function* MediaProbeLive() {
    const program = yield* Config.NonEmptyString("PEAL_FFPROBE_PATH").pipe(
      Config.withDefault("ffprobe")
    );

    const image = yield* makeSharpImageProbe(yield* loadSharp);
    const video = yield* makeFfprobeVideoProbe(program);

    const document = yield* makePdfDocumentProbe();

    return MediaProbe.of({
      probe: (source: MediaSource) => {
        const kind = kindOf(source.contentType);

        if (kind === "document") {
          return document(source);
        }

        return kind === "image" ? image(source) : video(source);
      },
    });
  })
).pipe(
  Layer.provide(FetchHttpClient.layer),
  // Bun's spawner is Node's child_process, which the tests on Node run too.
  Layer.provide(
    BunChildProcessSpawner.layer.pipe(
      Layer.provide(Layer.mergeAll(BunFileSystem.layer, BunPath.layer))
    )
  )
);
