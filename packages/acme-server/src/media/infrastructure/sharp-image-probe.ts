import { Effect, Option } from "effect";
import { HttpClient } from "effect/http";
import type Sharp from "sharp";

import { MediaProbeFailed } from "#media/application/media-probe-failed.ts";
import type {
  MediaSource,
  ProbeOutcome,
} from "#media/application/ports/media-probe.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";

type SharpModule = typeof Sharp;

/**
 * Loads sharp, which loads libvips built for the platform. Where it cannot,
 * for want of a prebuilt binary or of the C++ runtime, images go unprobed
 * rather than the server failing to start.
 */
export const loadSharp: Effect.Effect<Option.Option<SharpModule>> =
  Effect.tryPromise(async () => {
    const loaded = await import("sharp");

    return loaded.default;
  }).pipe(
    Effect.tapError((cause) =>
      Effect.logWarning("sharp did not load: images are not probed", cause)
    ),
    Effect.option
  );

const skipped: ProbeOutcome = { _tag: "skipped", reason: "probeUnavailable" };

/**
 * Reads an image's displayed dimensions with sharp: it fetches the file,
 * which is at most 16 MiB, and reads its header. EXIF orientation is applied,
 * so a portrait photo stored sideways reads as portrait. Without sharp,
 * probing is skipped.
 */
export const makeSharpImageProbe = Effect.fn("SharpImageProbe.make")(
  function* makeSharpImageProbe(sharp: Option.Option<SharpModule>) {
    const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient);

    return Effect.fn("SharpImageProbe.probe")(function* probe(
      source: MediaSource
    ) {
      if (Option.isNone(sharp)) {
        return skipped;
      }

      const bytes = yield* client.get(source.url).pipe(
        Effect.flatMap((response) => response.arrayBuffer),
        Effect.mapError(
          () =>
            new MediaProbeFailed({ detail: "the image could not be fetched" })
        )
      );

      const metadata = yield* Effect.tryPromise({
        catch: () =>
          new MediaProbeFailed({ detail: "the image is unreadable" }),
        try: async () => await sharp.value(bytes).metadata(),
      });

      const { height, width } = metadata.autoOrient;

      const outcome: ProbeOutcome = {
        _tag: "probed",
        metadata: new MediaMetadata({
          codec: Option.none(),
          dimensions:
            width > 0 && height > 0
              ? Option.some({ height, width })
              : Option.none(),
          duration: Option.none(),
        }),
      };

      return outcome;
    });
  }
);
