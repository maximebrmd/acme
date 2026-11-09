import { Duration, Effect, Option, Schema } from "effect";
import { Headers, HttpClient } from "effect/http";
import type Sharp from "sharp";

import { MediaProbeFailed } from "#media/application/media-probe-failed.ts";
import { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MediaTypeMismatch } from "#media/application/media-type-mismatch.ts";
import type {
  MediaSource,
  ProbeOutcome,
} from "#media/application/ports/media-probe.ts";
import { maxByteSize } from "#media/domain/media-format.ts";
import type { MediaContentType } from "#media/domain/media-format.ts";
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

const probeTimeout = Duration.minutes(1);

const ascii = (text: string): readonly number[] => [
  ...new TextEncoder().encode(text),
];

// How files of each image type peal takes begin: bytes at an offset.
const signatures: readonly {
  readonly contentType: MediaContentType;
  readonly starts: readonly (readonly [number, readonly number[]])[];
}[] = [
  {
    contentType: "image/png",
    starts: [[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]],
  },
  { contentType: "image/jpeg", starts: [[0, [0xff, 0xd8, 0xff]]] },
  { contentType: "image/gif", starts: [[0, ascii("GIF87a")]] },
  { contentType: "image/gif", starts: [[0, ascii("GIF89a")]] },
  {
    contentType: "image/webp",
    starts: [
      [0, ascii("RIFF")],
      [8, ascii("WEBP")],
    ],
  },
];

/** The image type a file's first bytes announce, if peal takes it. */
export const sniffImageType = (
  bytes: Uint8Array
): Option.Option<MediaContentType> =>
  Option.fromUndefinedOr(
    signatures.find(({ starts }) =>
      starts.every(([offset, expected]) =>
        expected.every((byte, index) => bytes[offset + index] === byte)
      )
    )
  ).pipe(Option.map(({ contentType }) => contentType));

// The formats peal takes, as sharp names them.
const sharpFormats = new Map<string, MediaContentType>([
  ["gif", "image/gif"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

const decodeContentLength = Schema.decodeUnknownOption(Schema.FiniteFromString);

const tooLarge = (byteSize: number): boolean => byteSize > maxByteSize.image;

/**
 * Reads an image's displayed dimensions with sharp: it fetches the file,
 * which is at most 16 MiB, checks that it is in the declared format, and
 * reads its header. Other formats sharp reads, such as SVG or TIFF, are
 * refused before sharp parses them. EXIF orientation is applied, so a
 * portrait photo stored sideways reads as portrait. Without sharp, probing
 * is skipped.
 */
export const makeSharpImageProbe = Effect.fn("SharpImageProbe.make")(
  function* makeSharpImageProbe(sharp: Option.Option<SharpModule>) {
    const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient);

    // A store that fails to serve the file is a storage failure, which a
    // later probe can retry, not a damaged file.
    const fetchImage = Effect.fn("SharpImageProbe.fetch")(
      function* fetchImage(url: string) {
        const response = yield* client.get(url);

        // Refused before the body is read into memory.
        const announced = Headers.get(response.headers, "content-length").pipe(
          Option.flatMap(decodeContentLength)
        );

        if (Option.exists(announced, tooLarge)) {
          return yield* new MediaProbeFailed({ reason: "tooLarge" });
        }

        const bytes = yield* response.arrayBuffer;

        return tooLarge(bytes.byteLength)
          ? yield* new MediaProbeFailed({ reason: "tooLarge" })
          : bytes;
      },
      Effect.catchTag("HttpClientError", (cause) =>
        Effect.fail(
          new MediaStorageFailed({ cause, operation: "read a file to probe" })
        )
      )
    );

    return Effect.fn("SharpImageProbe.probe")(function* probe(
      source: MediaSource
    ) {
      if (Option.isNone(sharp)) {
        return skipped;
      }

      const declared = source.contentType;

      const metadata = yield* Effect.gen(function* readImage() {
        const bytes = yield* fetchImage(source.url);

        if (!Option.contains(sniffImageType(new Uint8Array(bytes)), declared)) {
          return yield* new MediaTypeMismatch({ declared });
        }

        return yield* Effect.tryPromise({
          catch: () => new MediaProbeFailed({ reason: "unreadable" }),
          try: async () => await sharp.value(bytes).metadata(),
        });
      }).pipe(
        Effect.timeoutOrElse({
          duration: probeTimeout,
          orElse: () =>
            Effect.fail(new MediaProbeFailed({ reason: "timedOut" })),
        })
      );

      if (sharpFormats.get(metadata.format) !== declared) {
        return yield* new MediaTypeMismatch({ declared });
      }

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
